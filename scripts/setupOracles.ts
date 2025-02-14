import { ethers } from 'ethers'
import { ChainlinkConfig } from '../src/types'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import axios from 'axios'

dotenv.config()

interface OracleSetupConfig {
    network: string
    rpcUrl: string
    privateKey: string
    chainlinkNode: {
        url: string
        email: string
        password: string
    }
    feeds: {
        [key: string]: string // Asset symbol to Chainlink feed address
    }
}

async function main() {
    const config: OracleSetupConfig = {
        network: process.env.NETWORK || 'mainnet',
        rpcUrl: process.env.PROVIDER_URL as string,
        privateKey: process.env.PRIVATE_KEY as string,
        chainlinkNode: {
            url: process.env.CHAINLINK_NODE_URL as string,
            email: process.env.CHAINLINK_NODE_EMAIL as string,
            password: process.env.CHAINLINK_NODE_PASSWORD as string
        },
        feeds: {
            'ETH-USD': process.env.ETH_USD_FEED as string,
            'BTC-USD': process.env.BTC_USD_FEED as string,
            // Add more feed addresses as needed
        }
    }

    console.log(`Setting up oracles on ${config.network}...`)

    // Setup provider and signer
    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl)
    const signer = new ethers.Wallet(config.privateKey, provider)

    // Setup price feeds
    await setupPriceFeeds(signer, config)

    // Setup Chainlink jobs
    await setupChainlinkJobs(config)

    console.log('Oracle setup completed successfully!')
}

async function setupPriceFeeds(signer: ethers.Wallet, config: OracleSetupConfig) {
    console.log('Setting up price feeds...')

    // Verify each feed is responding
    for (const [pair, address] of Object.entries(config.feeds)) {
        const aggregator = new ethers.Contract(
            address,
            [
                'function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)',
                'function decimals() external view returns (uint8)'
            ],
            signer
        )

        try {
            const [roundId, answer, startedAt, updatedAt, answeredInRound] = 
                await aggregator.latestRoundData()
            const decimals = await aggregator.decimals()

            console.log(`${pair} Feed (${address}):`)
            console.log(`- Latest price: ${ethers.utils.formatUnits(answer, decimals)}`)
            console.log(`- Updated at: ${new Date(updatedAt.toNumber() * 1000).toISOString()}`)
        } catch (error) {
            console.error(`Failed to verify ${pair} feed:`, error)
            throw error
        }
    }
}

async function setupChainlinkJobs(config: OracleSetupConfig) {
    console.log('Setting up Chainlink jobs...')

    try {
        // Login to Chainlink node
        const { data: { data: { attributes: { token } } } } = await axios.post(
            `${config.chainlinkNode.url}/sessions`,
            {
                email: config.chainlinkNode.email,
                password: config.chainlinkNode.password
            }
        )

        // Create job specs for each deployment
        const deploymentPath = path.join(__dirname, '../deployments')
        const deploymentFiles = fs.readdirSync(deploymentPath)
        const latestDeployment = deploymentFiles[deploymentFiles.length - 1]
        const deployment = JSON.parse(
            fs.readFileSync(path.join(deploymentPath, latestDeployment), 'utf8')
        )

        // Setup jobs for TRAA (market data updates)
        await createMarketDataJob(config.chainlinkNode.url, token, deployment.TRAA.safeAddress)

        // Setup jobs for CAPE (credit data updates)
        await createCreditDataJob(config.chainlinkNode.url, token, deployment.CAPE.safeAddress)

        console.log('Chainlink jobs created successfully')
    } catch (error) {
        console.error('Failed to setup Chainlink jobs:', error)
        throw error
    }
}

async function createMarketDataJob(nodeUrl: string, token: string, safeAddress: string) {
    const jobSpec = {
        name: 'TRAA Market Data Update',
        type: 'directrequest',
        initiators: [
            {
                type: 'cron',
                params: { schedule: '*/15 * * * *' } // Every 15 minutes
            }
        ],
        tasks: [
            { type: 'httpget', params: { url: '${market_data_api_endpoint}' } },
            { type: 'jsonparse', params: { path: 'data' } },
            { type: 'multiply', params: { times: 100 } },
            {
                type: 'ethtx',
                params: {
                    address: safeAddress,
                    functionSelector: 'updateMarketData(uint256,uint256,uint256)'
                }
            }
        ]
    }

    await axios.post(
        `${nodeUrl}/v2/specs`,
        jobSpec,
        { headers: { Authorization: `Bearer ${token}` } }
    )
}

async function createCreditDataJob(nodeUrl: string, token: string, safeAddress: string) {
    const jobSpec = {
        name: 'CAPE Credit Data Update',
        type: 'directrequest',
        initiators: [
            {
                type: 'cron',
                params: { schedule: '0 */6 * * *' } // Every 6 hours
            }
        ],
        tasks: [
            { type: 'httpget', params: { url: '${credit_data_api_endpoint}' } },
            { type: 'jsonparse', params: { path: 'ratings' } },
            {
                type: 'ethtx',
                params: {
                    address: safeAddress,
                    functionSelector: 'updateCreditData(address[],uint256[])'
                }
            }
        ]
    }

    await axios.post(
        `${nodeUrl}/v2/specs`,
        jobSpec,
        { headers: { Authorization: `Bearer ${token}` } }
    )
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Oracle setup failed:', error)
        process.exit(1)
    })
