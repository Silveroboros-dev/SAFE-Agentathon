import OpenAI from 'openai'
import { ethers } from 'ethers'
import { SIAContract } from './SIAContract'
import { StrategyData, InvestmentAction } from './types'

export class StrategicInvestmentAgent {
    private openai: OpenAI
    private siaContract: SIAContract
    private hedgeContract: string

    constructor(
        signer: ethers.Signer,
        openaiApiKey: string,
        hedgeContract: string
    ) {
        this.openai = new OpenAI({
            apiKey: openaiApiKey
        })
        this.siaContract = new SIAContract(signer)
        this.hedgeContract = hedgeContract
    }

    async initialize(safeAddress?: string) {
        await this.siaContract.initialize(safeAddress)
    }

    async assessStrategy(strategyData: StrategyData): Promise<InvestmentAction> {
        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4-turbo-preview",
                messages: [
                    {
                        role: "system",
                        content: `You are a strategic investment analysis system. 
                        Evaluate market conditions, portfolio metrics, and macroeconomic 
                        factors to recommend investment actions. Consider hedging needs 
                        and risk-adjusted returns. Provide recommendations in JSON format.`
                    },
                    {
                        role: "user",
                        content: this.formatStrategyPrompt(strategyData)
                    }
                ],
                response_format: { type: "json_object" }
            })

            const analysis = JSON.parse(completion.choices[0].message.content)
            await this.executeStrategyAction(analysis)
            return analysis
        } catch (error) {
            console.error('Strategy assessment failed:', error)
            throw error
        }
    }

    private formatStrategyPrompt(strategyData: StrategyData): string {
        return `
        Analyze these market and portfolio conditions:
        
        Market Conditions:
        - Market Trend: ${strategyData.marketTrend}
        - Volatility Index: ${strategyData.volatilityIndex}
        - Interest Rates: ${strategyData.interestRates}
        
        Portfolio Status:
        - Current Allocation: ${JSON.stringify(strategyData.currentAllocation)}
        - Performance: ${strategyData.performance}
        - Risk Metrics: ${JSON.stringify(strategyData.riskMetrics)}
        
        Target Parameters:
        - Risk Tolerance: ${strategyData.riskTolerance}
        - Investment Horizon: ${strategyData.investmentHorizon}
        - Return Target: ${strategyData.returnTarget}

        Please evaluate and recommend:
        1. Allocation changes needed
        2. Hedging requirements
        3. Entry/exit points for positions
        4. Risk management adjustments
        `
    }

    private async executeStrategyAction(analysis: any) {
        // Handle investment recommendations
        if (analysis.allocationChanges) {
            for (const change of analysis.allocationChanges) {
                if (change.action === 'enter' || change.action === 'exit') {
                    await this.siaContract.proposeInvestment(
                        change.asset,
                        ethers.utils.parseEther(change.amount.toString()).toString(),
                        change.action === 'enter'
                    )
                }
            }
        }

        // Handle hedging recommendations
        if (analysis.hedgingActions) {
            for (const hedge of analysis.hedgingActions) {
                switch (hedge.action) {
                    case 'open_hedge':
                        await this.siaContract.proposeHedge(
                            this.hedgeContract,
                            ethers.utils.parseEther(hedge.amount.toString()).toString(),
                            hedge.direction
                        )
                        break
                    
                    case 'close_hedge':
                        await this.siaContract.closePosition(
                            this.hedgeContract,
                            hedge.positionId
                        )
                        break
                }
            }
        }
    }

    async getSafeAddress(): Promise<string> {
        return await this.siaContract.getSafeAddress()
    }

    async getBalance(): Promise<string> {
        return await this.siaContract.getBalance()
    }
}
