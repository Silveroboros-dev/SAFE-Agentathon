import OpenAI from 'openai'
import { ethers } from 'ethers'
import { TLAContract } from './TLAContract'
import { TradeLifecycleData, SettlementAction } from './types'

export class TradeLifecycleAgent {
    private openai: OpenAI
    private tlaContract: TLAContract
    private escrowContract: string

    constructor(
        signer: ethers.Signer,
        openaiApiKey: string,
        escrowContract: string
    ) {
        this.openai = new OpenAI({
            apiKey: openaiApiKey
        })
        this.tlaContract = new TLAContract(signer)
        this.escrowContract = escrowContract
    }

    async initialize(safeAddress?: string) {
        await this.tlaContract.initialize(safeAddress)
    }

    async assessTradeLifecycle(tradeData: TradeLifecycleData): Promise<SettlementAction> {
        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4-turbo-preview",
                messages: [
                    {
                        role: "system",
                        content: `You are a trade lifecycle management system. 
                        Analyze trade data and recommend actions for settlement, 
                        collateral management, and lifecycle events. Provide 
                        recommendations in JSON format.`
                    },
                    {
                        role: "user",
                        content: this.formatTradeDataPrompt(tradeData)
                    }
                ],
                response_format: { type: "json_object" }
            })

            const analysis = JSON.parse(completion.choices[0].message.content)
            await this.executeTradeAction(tradeData.tradeId, analysis)
            return analysis
        } catch (error) {
            console.error('Trade lifecycle assessment failed:', error)
            throw error
        }
    }

    private formatTradeDataPrompt(tradeData: TradeLifecycleData): string {
        return `
        Analyze this trade lifecycle event:
        Trade ID: ${tradeData.tradeId}
        Event Type: ${tradeData.eventType}
        Settlement Amount: ${tradeData.settlementAmount}
        Counterparty: ${tradeData.counterparty}
        Required Collateral: ${tradeData.requiredCollateral}
        Current Status: ${tradeData.status}

        Evaluate and recommend:
        1. Settlement actions needed
        2. Collateral adjustments required
        3. Any risk factors to consider
        4. Timeline for actions
        `
    }

    private async executeTradeAction(tradeId: string, analysis: any) {
        switch (analysis.recommendedAction) {
            case 'settle':
                await this.tlaContract.proposeSettlement(
                    tradeId,
                    ethers.utils.parseEther(analysis.settlementAmount.toString()).toString(),
                    analysis.counterparty
                )
                break

            case 'lock_collateral':
                await this.tlaContract.lockCollateral(
                    ethers.utils.parseEther(analysis.collateralAmount.toString()).toString(),
                    this.escrowContract
                )
                break

            case 'release_collateral':
                await this.tlaContract.releaseCollateral(
                    ethers.utils.parseEther(analysis.collateralAmount.toString()).toString(),
                    this.escrowContract,
                    analysis.recipient
                )
                break
        }
    }

    async getSafeAddress(): Promise<string> {
        return await this.tlaContract.getSafeAddress()
    }

    async getBalance(): Promise<string> {
        return await this.tlaContract.getBalance()
    }
}
