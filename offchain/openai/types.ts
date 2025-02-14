import { NewsAnalysis } from './NewsFeedService'

export interface HumanFeedback {
    riskAssessment?: string;
    recommendedActions?: string;
    additionalContext?: string;
}

export interface NewsItem {
    title: string;
    description: string;
    source: string;
    publishedAt: string;
    url: string;
}

export interface NewsAnalysis {
    sentiment: 'positive' | 'negative' | 'neutral';
    riskLevel: 'low' | 'medium' | 'high';
    keyInsights: string[];
    timestamp: number;
    exists: boolean;
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
    newsAnalysis?: NewsAnalysis;
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
