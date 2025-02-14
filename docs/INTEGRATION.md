# Integration Guide

This guide explains how to integrate new data sources and extend the AI logic in the WIN system.

## Adding New Data Sources

### Market Data Integration

1. **Create a Data Feed Class**
```typescript
class CustomMarketDataFeed implements MarketDataFeed {
    async fetchData(asset: string): Promise<MarketData> {
        // Your implementation here
    }
}
```

2. **Configure the Data Provider**
```typescript
// In your configuration file
export const dataFeeds = {
    market: new CustomMarketDataFeed({
        apiKey: process.env.DATA_PROVIDER_API_KEY,
        endpoint: 'https://api.provider.com'
    })
}
```

3. **Register with Agents**
```typescript
const traa = new TradeRiskAssessmentAgent(
    signer,
    openAiKey,
    {
        ...config,
        dataFeed: dataFeeds.market
    }
)
```

### Price Feed Integration

1. **Chainlink Oracle Integration**
```typescript
import { ChainlinkFeed } from './dataFeeds/ChainlinkFeed'

const priceFeed = new ChainlinkFeed({
    eth_usd: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    btc_usd: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c'
})
```

2. **Custom Oracle Implementation**
```typescript
class CustomPriceFeed implements PriceFeed {
    async getPrice(asset: string): Promise<BigNumber> {
        // Your implementation
    }
    
    async getHistoricalPrice(
        asset: string, 
        timestamp: number
    ): Promise<BigNumber> {
        // Your implementation
    }
}
```

## Extending AI Logic

### Customizing OpenAI Prompts

1. **Create Custom Prompt Template**
```typescript
class CustomPromptTemplate implements PromptTemplate {
    formatRiskAssessmentPrompt(data: MarketData): string {
        return `
            Custom prompt format...
            Asset: ${data.asset}
            ...
        `
    }
}
```

2. **Register Custom Template**
```typescript
const agent = new TradeRiskAssessmentAgent(
    signer,
    openAiKey,
    {
        ...config,
        promptTemplate: new CustomPromptTemplate()
    }
)
```

### Using Different AI Models

1. **Implement Custom AI Provider**
```typescript
class CustomAIProvider implements AIProvider {
    async generateCompletion(
        prompt: string,
        options: AIOptions
    ): Promise<AIResponse> {
        // Your implementation for different AI model
    }
}
```

2. **Configure Agent with Custom AI**
```typescript
const agent = new TradeRiskAssessmentAgent(
    signer,
    apiKey,
    {
        ...config,
        aiProvider: new CustomAIProvider()
    }
)
```

## Adding New Risk Metrics

1. **Define New Metric Type**
```typescript
interface CustomRiskMetrics extends RiskMetrics {
    customMetric: number;
    additionalData: {
        field1: string;
        field2: number;
    };
}
```

2. **Implement Calculation Logic**
```typescript
class CustomRiskCalculator implements RiskCalculator {
    calculateMetrics(data: MarketData): CustomRiskMetrics {
        // Your implementation
    }
}
```

3. **Update Agent Configuration**
```typescript
const agent = new TradeRiskAssessmentAgent(
    signer,
    openAiKey,
    {
        ...config,
        riskCalculator: new CustomRiskCalculator()
    }
)
```

## Contract Upgrades

### Safe Module Integration

1. **Create New Module**
```solidity
contract CustomModule is SafeModule {
    function executeCustomLogic(
        params...
    ) external onlyOwner {
        // Your implementation
    }
}
```

2. **Deploy and Enable Module**
```typescript
const moduleAddress = '0x...' // Your deployed module
await safe.enableModule(moduleAddress)
```

### Modifying Transaction Flows

1. **Custom Transaction Guard**
```solidity
contract CustomGuard is SafeGuard {
    function checkTransaction(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes memory signatures,
        address msgSender
    ) external override {
        // Your custom transaction validation
    }
}
```

2. **Implement Custom Logic**
```typescript
class CustomTransactionBuilder implements TransactionBuilder {
    async buildTransaction(
        params: TransactionParams
    ): Promise<SafeTransaction> {
        // Your custom transaction building logic
    }
}
```

## Testing Integration

### Market Data Mock
```typescript
class MockMarketDataFeed implements MarketDataFeed {
    async fetchData(asset: string): Promise<MarketData> {
        return {
            asset,
            currentPrice: '1000',
            priceChange24h: 5,
            volatility30d: 0.2,
            volume24h: '1000000',
            currentExposure: '500000'
        }
    }
}
```

### Test Configuration
```typescript
describe('Custom Integration Tests', () => {
    const mockFeed = new MockMarketDataFeed()
    const agent = new TradeRiskAssessmentAgent(
        signer,
        openAiKey,
        {
            ...config,
            dataFeed: mockFeed
        }
    )
    
    it('should handle custom data source', async () => {
        // Your test implementation
    })
})
```...
