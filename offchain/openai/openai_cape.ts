import OpenAI from 'openai'
import { ethers } from 'ethers'
import { CAPEContract } from './CAPEContract'
import { NewsFeedOracle } from './NewsFeedOracle'
import { ExposureData, CounterpartyAction } from './types'
import { promptManager } from './prompts'
import { ApprovalWorkflow } from './ApprovalWorkflow'
import { ApprovalStatus } from './types/approval'

export class CounterpartyExposureAgent {
    private openai: OpenAI
    private capeContract: CAPEContract
    private limitsContract: string
    private newsFeedOracle: NewsFeedOracle
    private approvalWorkflow: ApprovalWorkflow

    constructor(
        signer: ethers.Signer,
        openaiApiKey: string,
        limitsContract: string,
        newsFeedOracleAddress: string,
        newsFeedOracleABI: ethers.ContractInterface
    ) {
        this.openai = new OpenAI({
            apiKey: openaiApiKey
        })
        this.capeContract = new CAPEContract(signer)
        this.limitsContract = limitsContract
        this.newsFeedOracle = new NewsFeedOracle(
            newsFeedOracleAddress,
            newsFeedOracleABI,
            signer,
            openaiApiKey
        )
        this.approvalWorkflow = new ApprovalWorkflow()
    }

    async initialize(safeAddress?: string) {
        await this.capeContract.initialize(safeAddress)
    }

    /**
     * Assesses counterparty exposure and determines appropriate actions
     * 
     * For high-risk decisions, this method will:
     * 1. Create an approval request
     * 2. Throw an error with the request ID
     * 3. Prevent execution until approved
     * 
     * @param exposureData - Data about the counterparty exposure
     * @param humanFeedback - Optional feedback from human operators
     * @returns The proposed action
     * @throws Error if approval is required, including the request ID
     */
    async assessExposure(
        exposureData: ExposureData, 
        humanFeedback?: {
            riskAssessment?: string;
            recommendedActions?: string;
            additionalContext?: string;
        }
    ): Promise<CounterpartyAction> {
        try {
            // Get latest news analysis from oracle
            const newsAnalysis = await this.newsFeedOracle.getNewsAnalysis(exposureData.counterpartyId)
            exposureData.newsAnalysis = newsAnalysis

            const completion = await this.openai.chat.completions.create({
                ...promptManager.getParameters('cape'),
                messages: [
                    {
                        role: "system",
                        content: promptManager.getSystemPrompt('cape')
                    },
                    {
                        role: "user",
                        content: this.formatExposurePrompt(exposureData, humanFeedback)
                    }
                ]
            })

            const analysis = JSON.parse(completion.choices[0].message.content)
            
            // Check if approval is required
            const riskLevel = this.approvalWorkflow.determineRiskLevel(exposureData)
            if (this.approvalWorkflow.requiresApproval(riskLevel)) {
                const approvalRequest = await this.approvalWorkflow.createApprovalRequest(
                    exposureData,
                    analysis
                )
                throw new Error(`High-risk decision requires approval. Request ID: ${approvalRequest.id}`)
            }

            await this.executeExposureAction(analysis)
            return analysis
        } catch (error) {
            console.error('Exposure assessment failed:', error)
            throw error
        }
    }

    /**
     * Executes an action that has been approved through the approval workflow
     * 
     * @param approvalRequestId - ID of the approved request
     * @throws Error if request not found or not approved
     */
    async executeApprovedAction(approvalRequestId: string): Promise<void> {
        const request = this.approvalWorkflow.getApprovalRequest(approvalRequestId)
        
        if (!request) {
            throw new Error(`Approval request ${approvalRequestId} not found`)
        }

        if (request.status !== ApprovalStatus.APPROVED) {
            throw new Error(`Cannot execute action. Request status: ${request.status}`)
        }

        await this.executeExposureAction(request.proposedAction)
    }

    /**
     * Gets all currently pending approval requests
     * 
     * @returns Array of pending approval requests
     */
    getPendingApprovals(): any[] {
        return this.approvalWorkflow.getPendingApprovals()
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

        News Analysis:
        - Sentiment: ${exposureData.newsAnalysis?.sentiment || 'No data'}
        - Risk Level from News: ${exposureData.newsAnalysis?.riskLevel || 'No data'}
        - Key Insights: ${exposureData.newsAnalysis?.keyInsights?.join(', ') || 'No data'}
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
