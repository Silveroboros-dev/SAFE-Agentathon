/**
 * Risk levels for counterparty exposure decisions
 * Used to determine approval requirements and workflow routing
 */
export enum RiskLevel {
    /** Standard operations with minimal risk */
    LOW = 'LOW',
    /** Operations that require monitoring but no approval */
    MEDIUM = 'MEDIUM',
    /** Requires explicit approval before execution */
    HIGH = 'HIGH',
    /** Highest risk level, requires immediate attention */
    CRITICAL = 'CRITICAL'
}

/**
 * Current status of an approval request
 */
export enum ApprovalStatus {
    /** Awaiting approval decision */
    PENDING = 'PENDING',
    /** Action approved and ready for execution */
    APPROVED = 'APPROVED',
    /** Action rejected and cannot be executed */
    REJECTED = 'REJECTED',
    /** Request expired without decision (24-hour timeout) */
    EXPIRED = 'EXPIRED'
}

/**
 * Represents a request for approval of a high-risk decision
 */
export interface ApprovalRequest {
    /** Unique identifier for the approval request */
    id: string;
    /** Timestamp when the request was created */
    timestamp: number;
    /** Assessed risk level of the proposed action */
    riskLevel: RiskLevel;
    /** Original exposure data that triggered the approval request */
    exposureData: any; // Will be typed as ExposureData
    /** Proposed action requiring approval */
    proposedAction: any; // Will be typed as CounterpartyAction
    /** Current status of the approval request */
    status: ApprovalStatus;
    /** Identity of the approver (if decision made) */
    approver?: string;
    /** Timestamp of the approval decision */
    approvalTimestamp?: number;
    /** Reasoning provided for the approval decision */
    reasoning?: string;
    /** Timestamp when the request will expire */
    expiresAt: number;
}

/**
 * Represents an approval decision made by an authorized approver
 */
export interface ApprovalDecision {
    /** Whether the request was approved or rejected */
    approved: boolean;
    /** Optional reasoning for the decision */
    reasoning?: string;
    /** Identity of the approver making the decision */
    approver: string;
}
