# High-Risk Decision Approval Workflow

## Overview
The Approval Workflow system provides a robust mechanism for managing high-risk decisions in the SAFE-Agentathon project. It ensures that potentially risky actions undergo proper review and approval before execution.

## Key Components

### Risk Levels
- `LOW`: Standard operations with minimal risk
- `MEDIUM`: Operations that require monitoring but no approval
- `HIGH`: Requires explicit approval before execution
- `CRITICAL`: Highest risk level, requires immediate attention

### Approval States
- `PENDING`: Awaiting approval decision
- `APPROVED`: Action approved and ready for execution
- `REJECTED`: Action rejected and cannot be executed
- `EXPIRED`: Request expired without decision (24-hour timeout)

## Risk Assessment Criteria

### Automatic Risk Classification
1. **Exposure Thresholds**
   - HIGH: Exposure ≥ 100,000 ETH
   - CRITICAL: Exposure ≥ 500,000 ETH

2. **Additional Risk Factors**
   - Market volatility > 50%
   - Low credit rating (C or below)
   - Negative news sentiment + Exposure > Collateral

## Usage Guide

### Basic Implementation
```typescript
try {
    // Attempt to assess exposure
    await agent.assessExposure(exposureData);
} catch (error) {
    if (error.message.includes('requires approval')) {
        const requestId = error.message.split('Request ID: ')[1];
        // Handle approval flow
    }
}
```

### Approval Management
```typescript
// Get all pending approvals
const pendingApprovals = agent.getPendingApprovals();

// Execute an approved action
await agent.executeApprovedAction(approvalRequestId);
```

## Security Features

### Automatic Safeguards
- 24-hour expiration on pending approvals
- Immutable approval records
- Risk level cannot be downgraded once set
- Validation of approval status before execution

### Best Practices
1. Always check approval status before execution
2. Handle expired approvals appropriately
3. Document approval decisions with reasoning
4. Maintain audit trail of all approval actions

## Error Handling

### Common Error Scenarios
1. **Approval Not Found**
   ```typescript
   Error: Approval request ${requestId} not found
   ```

2. **Invalid Status**
   ```typescript
   Error: Cannot execute action. Request status: ${status}
   ```

3. **Expired Request**
   ```typescript
   Error: Approval request ${requestId} has expired
   ```

## Integration Example

```typescript
class YourService {
    private agent: CounterpartyExposureAgent;

    async handleExposureAssessment(exposureData: ExposureData) {
        try {
            // Attempt direct assessment
            const result = await this.agent.assessExposure(exposureData);
            return result;
        } catch (error) {
            if (error.message.includes('requires approval')) {
                // Extract request ID
                const requestId = error.message.split('Request ID: ')[1];
                
                // Store for approval workflow
                await this.notifyApprovers(requestId);
                
                // Return pending status
                return {
                    status: 'PENDING_APPROVAL',
                    requestId
                };
            }
            throw error;
        }
    }

    async handleApprovalDecision(
        requestId: string,
        approved: boolean,
        approver: string,
        reasoning?: string
    ) {
        if (approved) {
            await this.agent.executeApprovedAction(requestId);
            return { status: 'EXECUTED' };
        }
        return { status: 'REJECTED' };
    }
}
```

## Monitoring and Maintenance

### Key Metrics to Monitor
- Number of pending approvals
- Average approval time
- Approval/rejection ratio
- Expired request rate

### Regular Maintenance Tasks
1. Clean up expired approvals
2. Archive old approval records
3. Review approval patterns
4. Update risk thresholds as needed

## Future Enhancements
- Multi-signature approval support
- Approval delegation framework
- Real-time notification system
- Enhanced audit logging
- Risk scoring algorithms
- Integration with external risk assessment services
