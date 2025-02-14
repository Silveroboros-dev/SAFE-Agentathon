import { BigNumber } from 'ethers'

// Common Types
export interface SafeTransactionConfig {
    to: string
    value: string
    data: string
}

export interface BaseResponse {
    timestamp: number
    confidence: number
    reasoning: string[]
}

// TRAA (Trade Risk Assessment Agent) Types
export interface MarketData {
    asset: string
    currentPrice: string
    priceChange24h: number
    volatility30d: number
    volume24h: string
    currentExposure: string
}

export interface RiskAssessment extends BaseResponse {
    valueAtRisk: number
    volatility: number
    exposure: number
    breachesLimit: boolean
    recommendedAction: 'maintain' | 'reduce_position' | 'increase_position'
    suggestedReduction?: number
}

export interface RiskLimits {
    maxExposure: BigNumber
    varLimit: BigNumber
    volatilityThreshold: BigNumber
}

// TLA (Trade Lifecycle Agent) Types
export interface TradeLifecycleData {
    tradeId: string
    eventType: 'initiation' | 'settlement' | 'maturity' | 'default'
    settlementAmount: string
    counterparty: string
    requiredCollateral: string
    status: 'pending' | 'active' | 'settling' | 'completed' | 'defaulted'
    settlementDate?: number
    terms?: {
        asset: string
        quantity: string
        price: string
        collateralRatio: number
    }
}

export interface SettlementAction extends BaseResponse {
    recommendedAction: 'settle' | 'lock_collateral' | 'release_collateral' | 'wait'
    settlementAmount?: string
    collateralAmount?: string
    recipient?: string
    deadline?: number
    conditions?: string[]
}

// SIA (Strategic Investment Agent) Types
export interface StrategyData {
    marketTrend: 'bullish' | 'bearish' | 'neutral'
    volatilityIndex: number
    interestRates: number
    currentAllocation: {
        asset: string
        percentage: number
        value: string
    }[]
    performance: {
        daily: number
        weekly: number
        monthly: number
        yearly: number
    }
    riskMetrics: {
        sharpeRatio: number
        sortino: number
        maxDrawdown: number
        beta: number
    }
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
    investmentHorizon: 'short' | 'medium' | 'long'
    returnTarget: number
}

export interface InvestmentAction extends BaseResponse {
    allocationChanges?: {
        asset: string
        action: 'enter' | 'exit' | 'hold'
        amount: string
        timing: 'immediate' | 'staged'
        reason: string
    }[]
    hedgingActions?: {
        action: 'open_hedge' | 'close_hedge'
        direction: 'long' | 'short'
        amount: string
        positionId?: string
        instrument: string
    }[]
    rebalanceNeeded: boolean
    riskAdjustments?: {
        metric: string
        currentValue: number
        targetValue: number
        suggestedActions: string[]
    }[]
}

// CAPE (Counterparty & Portfolio Exposure Agent) Types
export interface ExposureData {
    counterpartyId: string
    creditRating: string
    currentExposure: string
    exposureLimit: string
    collateralHeld: string
    netPosition: string
    marketVolatility: number
    sectorPerformance: number
    creditSpreads: number
    counterpartyMetrics?: {
        defaultProbability: number
        creditScore: number
        historicalPerformance: {
            paymentHistory: number
            defaultEvents: number
            averageDelay: number
        }
    }
}

export interface CounterpartyAction extends BaseResponse {
    collateralAction?: {
        action: 'request_collateral' | 'return_collateral' | 'none'
        amount: string
        deadline?: number
        reason: string
    }
    exposureAction?: {
        action: 'reduce_exposure' | 'increase_limit' | 'maintain'
        amount: string
        asset: string
        timeline: 'immediate' | 'gradual'
    }
    limitAction?: {
        action: 'update_limit' | 'maintain'
        newLimit?: string
        justification: string[]
    }
    monitoringChanges?: {
        frequency: 'daily' | 'weekly' | 'monthly'
        additionalMetrics: string[]
        alertThresholds: {
            metric: string
            threshold: number
        }[]
    }
}

// Configuration Types
export interface AgentConfig {
    network: string
    safeAddress?: string
    providerUrl: string
    openAiKey: string
    customContracts?: {
        escrow?: string
        hedge?: string
        limits?: string
    }
}

// Event Types
export interface AgentEvent {
    timestamp: number
    agentId: string
    eventType: string
    data: any
    status: 'pending' | 'completed' | 'failed'
    transactionHash?: string
}

// Error Types
export interface AgentError {
    code: string
    message: string
    timestamp: number
    context?: any
    severity: 'low' | 'medium' | 'high' | 'critical'
}
