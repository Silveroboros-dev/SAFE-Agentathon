import { ethers } from 'ethers';
import { ApprovalRequest, ApprovalStatus, RiskLevel, ApprovalDecision } from './types/approval';
import { ExposureData, CounterpartyAction } from './types';

/**
 * Manages the workflow for high-risk decision approvals in the SAFE-Agentathon system.
 * 
 * This class handles:
 * - Risk level assessment
 * - Approval request creation and management
 * - Request status tracking
 * - Automatic request expiration
 * 
 * @example
 * ```typescript
 * const workflow = new ApprovalWorkflow();
 * const riskLevel = workflow.determineRiskLevel(exposureData);
 * 
 * if (workflow.requiresApproval(riskLevel)) {
 *     const request = await workflow.createApprovalRequest(exposureData, proposedAction);
 * }
 * ```
 */
export class ApprovalWorkflow {
    private pendingApprovals: Map<string, ApprovalRequest>;
    private readonly APPROVAL_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    private readonly HIGH_RISK_THRESHOLD = ethers.utils.parseEther("100000"); // 100k threshold
    private readonly CRITICAL_RISK_THRESHOLD = ethers.utils.parseEther("500000"); // 500k threshold

    /**
     * Initializes the approval workflow
     */
    constructor() {
        this.pendingApprovals = new Map();
        // Clean up expired approvals periodically
        setInterval(() => this.cleanupExpiredApprovals(), 60 * 60 * 1000); // Every hour
    }

    /**
     * Determines the risk level of a proposed action based on exposure data
     * 
     * Risk is determined by:
     * - Exposure amount (>100k ETH for HIGH, >500k ETH for CRITICAL)
     * - Market volatility
     * - Credit rating
     * - News sentiment combined with exposure vs collateral ratio
     * 
     * @param exposureData - The exposure data to assess
     * @returns The determined risk level
     */
    public determineRiskLevel(exposureData: ExposureData): RiskLevel {
        const exposureAmount = ethers.BigNumber.from(exposureData.currentExposure);
        
        if (exposureAmount.gte(this.CRITICAL_RISK_THRESHOLD)) {
            return RiskLevel.CRITICAL;
        }
        
        if (exposureAmount.gte(this.HIGH_RISK_THRESHOLD)) {
            return RiskLevel.HIGH;
        }

        // Additional risk factors
        if (
            exposureData.marketVolatility > 0.5 || 
            exposureData.creditRating.toLowerCase().includes('c') ||
            (exposureData.newsAnalysis?.sentiment === 'negative' && 
             exposureData.currentExposure > exposureData.collateralHeld)
        ) {
            return RiskLevel.HIGH;
        }

        return RiskLevel.MEDIUM;
    }

    /**
     * Checks if a given risk level requires explicit approval
     * 
     * @param riskLevel - The risk level to check
     * @returns True if approval is required, false otherwise
     */
    public requiresApproval(riskLevel: RiskLevel): boolean {
        return riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL;
    }

    /**
     * Creates a new approval request for a high-risk decision
     * 
     * @param exposureData - The exposure data that triggered the approval requirement
     * @param proposedAction - The action requiring approval
     * @returns The created approval request
     */
    public async createApprovalRequest(
        exposureData: ExposureData,
        proposedAction: CounterpartyAction
    ): Promise<ApprovalRequest> {
        const riskLevel = this.determineRiskLevel(exposureData);
        
        const approvalRequest: ApprovalRequest = {
            id: `apr_${Date.now()}_${exposureData.counterpartyId}`,
            timestamp: Date.now(),
            riskLevel,
            exposureData,
            proposedAction,
            status: ApprovalStatus.PENDING,
            expiresAt: Date.now() + this.APPROVAL_TIMEOUT
        };

        this.pendingApprovals.set(approvalRequest.id, approvalRequest);
        return approvalRequest;
    }

    /**
     * Processes an approval decision for a pending request
     * 
     * @param requestId - ID of the request to process
     * @param decision - The approval decision
     * @returns The updated approval request
     * @throws Error if request not found, not pending, or expired
     */
    public async processApprovalDecision(
        requestId: string,
        decision: ApprovalDecision
    ): Promise<ApprovalRequest> {
        const request = this.pendingApprovals.get(requestId);
        
        if (!request) {
            throw new Error(`Approval request ${requestId} not found`);
        }

        if (request.status !== ApprovalStatus.PENDING) {
            throw new Error(`Approval request ${requestId} is not pending`);
        }

        if (request.expiresAt < Date.now()) {
            request.status = ApprovalStatus.EXPIRED;
            throw new Error(`Approval request ${requestId} has expired`);
        }

        request.status = decision.approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
        request.approver = decision.approver;
        request.approvalTimestamp = Date.now();
        request.reasoning = decision.reasoning;

        return request;
    }

    /**
     * Retrieves an approval request by its ID
     * 
     * @param requestId - ID of the request to retrieve
     * @returns The approval request if found, undefined otherwise
     */
    public getApprovalRequest(requestId: string): ApprovalRequest | undefined {
        return this.pendingApprovals.get(requestId);
    }

    /**
     * Gets all currently pending approval requests
     * 
     * @returns Array of pending approval requests
     */
    public getPendingApprovals(): ApprovalRequest[] {
        return Array.from(this.pendingApprovals.values())
            .filter(request => request.status === ApprovalStatus.PENDING);
    }

    /**
     * Cleans up expired approval requests
     * This is called automatically every hour
     * @private
     */
    private cleanupExpiredApprovals(): void {
        const now = Date.now();
        for (const [id, request] of this.pendingApprovals) {
            if (request.expiresAt < now && request.status === ApprovalStatus.PENDING) {
                request.status = ApprovalStatus.EXPIRED;
            }
        }
    }
}
