import OpenAI from 'openai'
import { ethers } from 'ethers'
import { CAPEContract } from './CAPEContract'
import { ExposureData, CounterpartyAction } from './types'

export class CounterpartyExposureAgent {
    private openai: OpenAI
    private capeContract: CAPEContract
    private limitsContract: string

    constructor(
        signer: ethers.Signer,
        openaiApiKey: string,
        limitsContract: string
    ) {
        this.openai = new OpenAI({
            apiKey: openaiApiKey
        })
        this.capeContract = new CAPEContract(signer)
        this.limitsContract = limitsContract
    }

    async initialize(safeAddress?: string) {
        await this.capeContract.initialize(safeAddress)
    }

    async assessExposure(
        exposureData: ExposureData, 
        humanFeedback?: {
            riskAssessment?: string;
            recommendedActions?: string;
            additionalContext?: string;
        }
    ): Promise<CounterpartyAction> {
        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4-turbo-preview",
                messages: [
                    {
                        role: "system",
                        content: `You are a counterparty risk assessment system. 
                        Evaluate exposure levels, credit metrics, and collateral 
                        requirements. Consider market conditions, historical 
                        performance, and human expert feedback when provided. 
                        Balance automated analysis with human expertise to make 
                        well-rounded decisions. Provide recommendations in JSON format.`
                    },
                    {
                        role: "user",
                        content: this.formatExposurePrompt(exposureData, humanFeedback)
                    }
                ],
                response_format: { type: "json_object" }
            })

            const analysis = JSON.parse(completion.choices[0].message.content)
            await this.executeExposureAction(analysis)
            return analysis
        } catch (error) {
            console.error('Exposure assessment failed:', error)
            throw error
        }
    }

    private formatExposurePrompt(
        exposureData: ExposureData, 
        humanFeedback?: {
            riskAssessment?: string;
            recommendedActions?: string;
            additionalContext?: string;
        }
    ): string {
        let prompt = `
        Analyze counterparty exposure metrics:

        Counterparty Details:
        - ID: ${exposureData.counterpartyId}
        - Credit Rating: ${exposureData.creditRating}
        - Current Exposure: ${exposureData.currentExposure}
        
        Exposure Metrics:
        - Exposure Limit: ${exposureData.exposureLimit}
        - Collateral Held: ${exposureData.collateralHeld}
        - Net Position: ${exposureData.netPosition}
        
        Market Context:
        - Market Volatility: ${exposureData.marketVolatility}
        - Sector Performance: ${exposureData.sectorPerformance}
        - Credit Spreads: ${exposureData.creditSpreads}
        `

        if (humanFeedback) {
            prompt += `
        Human Expert Feedback:
        ${humanFeedback.riskAssessment ? `- Risk Assessment: ${humanFeedback.riskAssessment}` : ''}
        ${humanFeedback.recommendedActions ? `- Recommended Actions: ${humanFeedback.recommendedActions}` : ''}
        ${humanFeedback.additionalContext ? `- Additional Context: ${humanFeedback.additionalContext}` : ''}
        `
        }

        prompt += `
        Please evaluate and recommend:
        1. Exposure limit adjustments
        2. Collateral requirements
        3. Risk mitigation actions
        4. Monitoring frequency changes

        Provide your response in JSON format with the following structure:
        {
            "riskLevel": "low|medium|high",
            "collateralAction": "maintain|request_collateral",
            "collateralAmount": number,
            "exposureAction": "maintain|reduce_exposure",
            "reductionAmount": number,
            "monitoringFrequency": "daily|weekly|monthly",
            "rationale": "string explaining the decision",
            "considerationOfHumanFeedback": "string explaining how human feedback was incorporated (if provided)"
        }
        `

        return prompt
    }

    private async executeExposureAction(analysis: any) {
        // Handle collateral calls
        if (analysis.collateralAction === 'request_collateral') {
            await this.capeContract.requestCollateralCall(
                analysis.counterpartyId,
                ethers.utils.parseEther(analysis.collateralAmount.toString()).toString(),
                Math.floor(Date.now() / 1000) + analysis.deadlineHours * 3600
            )
        }

        // Handle exposure reduction
        if (analysis.exposureAction === 'reduce_exposure') {
            await this.capeContract.reduceExposure(
                analysis.counterpartyId,
                ethers.utils.parseEther(analysis.reductionAmount.toString()).toString(),
                analysis.asset
            )
        }

        // Handle limit updates
        if (analysis.limitAction === 'update_limit') {
            await this.capeContract.updateCounterpartyLimits(
                this.limitsContract,
                analysis.counterpartyId,
                ethers.utils.parseEther(analysis.newLimit.toString()).toString()
            )
        }
    }

    async getSafeAddress(): Promise<string> {
        return await this.capeContract.getSafeAddress()
    }

    async getBalance(): Promise<string> {
        return await this.capeContract.getBalance()
    }
}
