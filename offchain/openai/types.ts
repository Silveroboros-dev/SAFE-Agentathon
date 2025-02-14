export interface HumanFeedback {
    riskAssessment?: string;
    recommendedActions?: string;
    additionalContext?: string;
}

export interface ExposureData {
    counterpartyId: string;
    creditRating: string;
    currentExposure: number;
    exposureLimit: number;
    collateralHeld: number;
    netPosition: number;
    marketVolatility: number;
    sectorPerformance: string;
    creditSpreads: number;
}

export interface CounterpartyAction {
    riskLevel: 'low' | 'medium' | 'high';
    collateralAction: 'maintain' | 'request_collateral';
    collateralAmount: number;
    exposureAction: 'maintain' | 'reduce_exposure';
    reductionAmount: number;
    monitoringFrequency: 'daily' | 'weekly' | 'monthly';
    rationale: string;
    considerationOfHumanFeedback?: string;
}
