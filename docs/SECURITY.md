# Security Model

This document outlines the security model of the WIN system, focusing on how Safe accounts protect assets and how to review AI-proposed transactions.

## Safe Account Security

### Multi-Signature Configuration

The system uses Safe's multi-signature functionality to secure all transactions:

1. **Owner Structure**
```typescript
const safeAccountConfig: SafeAccountConfig = {
    owners: [
        adminAddress,
        riskManagerAddress,
        aiAgentAddress
    ],
    threshold: 2  // Requires 2 signatures
}
```

2. **Signature Requirements**
- AI agent proposals require human approval
- Critical transactions require both admin and risk manager signatures
- Emergency actions may require all three signatures

### Timelock Mechanisms

1. **Standard Delays**
```typescript
const TIMELOCK_DELAYS = {
    STANDARD: 24 * 3600,    // 24 hours
    LARGE: 48 * 3600,       // 48 hours
    CRITICAL: 72 * 3600     // 72 hours
}
```

2. **Implementation**
```typescript
class TimelockGuard implements SafeGuard {
    checkTransaction(
        to: string,
        value: BigNumber,
        data: string,
        ...
    ) {
        const delay = this.getRequiredDelay(value)
        require(
            block.timestamp >= proposalTime + delay,
            "Timelock period not elapsed"
        )
    }
}
```

## Transaction Review Process

### AI-Proposed Transactions

1. **Transaction Structure**
```typescript
interface AIProposedTransaction {
    transaction: SafeTransaction;
    reasoning: {
        analysis: string;
        riskAssessment: string;
        confidence: number;
    };
    metadata: {
        proposalTime: number;
        urgency: 'low' | 'medium' | 'high';
        impactAssessment: string;
    };
}
```

2. **Review Checklist**
- [ ] Verify transaction parameters
- [ ] Review AI reasoning and confidence
- [ ] Check risk assessment metrics
- [ ] Validate against policy limits
- [ ] Confirm timelock requirements

### Review Interface Example
```typescript
async function reviewTransaction(
    proposal: AIProposedTransaction
): Promise<ReviewResult> {
    // 1. Basic validation
    const validationResult = await validateTransaction(proposal)
    if (!validationResult.valid) {
        return {
            approved: false,
            reason: validationResult.reason
        }
    }

    // 2. Risk check
    const riskResult = await checkRiskLimits(proposal)
    if (riskResult.breachesLimits) {
        return {
            approved: false,
            reason: `Risk limit breach: ${riskResult.details}`
        }
    }

    // 3. Policy compliance
    const policyResult = await checkPolicyCompliance(proposal)
    if (!policyResult.compliant) {
        return {
            approved: false,
            reason: policyResult.violatedPolicies.join(', ')
        }
    }

    return {
        approved: true,
        requiredSigners: getRequiredSigners(proposal)
    }
}
```

## Emergency Procedures

### Circuit Breakers

1. **Automatic Triggers**
```typescript
const CIRCUIT_BREAKERS = {
    DAILY_LOSS_LIMIT: -5.0,  // 5% daily loss
    EXPOSURE_LIMIT: 0.25,    // 25% of portfolio
    VOLATILITY_THRESHOLD: 0.5 // 50% increase in volatility
