import OpenAI from 'openai'
import { ethers } from 'ethers'
import { TRAAContract } from './TRAAContract'
import { MarketData, RiskAssessment } from './types'
import { promptManager } from './prompts'

export class TradeRiskAssessmentAgent {
    private openai: OpenAI
    private traaContract: TRAAContract
    private riskLimits: {
        maxExposure: number
        varLimit: number
        volatilityThreshold: number
    }

    constructor(
        signer: ethers.Signer,
        openaiApiKey: string,
        riskLimits: {
            maxExposure: number
            varLimit: number
            volatilityThreshold: number
        }
    ) {
        this.openai = new OpenAI({
            apiKey: openaiApiKey
        })
        this.traaContract = new TRAAContract(signer)
        this.riskLimits = riskLimits
    }

    async initialize(safeAddress?: string) {
        await this.traaContract.initialize(safeAddress)
    }

    async assessRisk(marketData: MarketData): Promise<RiskAssessment> {
        try {
            const completion = await this.openai.chat.completions.create({
                ...promptManager.getParameters('traa'),
                messages: [
                    {
                        role: "system",
                        content: promptManager.getSystemPrompt('traa')
                    },
                    {
                        role: "user",
                        content: this.formatMarketDataPrompt(marketData)
                    }
                ]
            })

            const analysis = JSON.parse(completion.choices[0].message.content)
            
            if (this.detectRiskBreach(analysis)) {
                await this.proposeRiskMitigation(marketData.asset, analysis)
            }

            return analysis
        } catch (error) {
            console.error('Risk assessment failed:', error)
            throw error
        }
    }

    private formatMarketDataPrompt(marketData: MarketData): string {
        return `
        Analyze these market conditions:
        Asset: ${marketData.asset}
        Price: ${marketData.currentPrice}
        24h Change: ${marketData.priceChange24h}%
        Volume: ${marketData.volume24h}
        Exposure: ${marketData.currentExposure}

        Risk Limits:
        Max Exposure: ${this.riskLimits.maxExposure}
        VaR Limit: ${this.riskLimits.varLimit}
        Volatility Threshold: ${this.riskLimits.volatilityThreshold}

        Provide:
        1. Calculated Value at Risk
        2. Current volatility estimate
        3. Recommended actions if risks exceed limits
        4. Suggested position size adjustments if needed
        `
    }

    private detectRiskBreach(analysis: any): boolean {
        return (
            analysis.valueAtRisk > this.riskLimits.varLimit ||
            analysis.volatility > this.riskLimits.volatilityThreshold ||
            analysis.exposure > this.riskLimits.maxExposure
        )
    }

    private async proposeRiskMitigation(asset: string, analysis: any) {
        if (analysis.recommendedAction === 'reduce_position') {
            const reductionAmount = ethers.utils.parseEther(
                analysis.suggestedReduction.toString()
            ).toString()
            
            // Use Safe transaction to propose position reduction
            await this.traaContract.proposeRiskMitigation(
                asset,
                reductionAmount,
                await this.traaContract.getSafeAddress()
            )
        }
    }

    async getSafeAddress(): Promise<string> {
        return await this.traaContract.getSafeAddress()
    }

    async getBalance(): Promise<string> {
        return await this.traaContract.getBalance()
    }
}
