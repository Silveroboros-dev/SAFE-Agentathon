import { ethers } from 'ethers'
import { EthersAdapter } from '@safe-global/protocol-kit'
import { SafeFactory } from '@safe-global/protocol-kit'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

interface DeploymentConfig {
    network: string
    rpcUrl: string
    privateKey: string
    owners: string[]
}

async function main() {
    const config: DeploymentConfig = {
        network: process.env.NETWORK || 'mainnet',
        rpcUrl: process.env.PROVIDER_URL as string,
        privateKey: process.env.SAFE_OWNER_PRIVATE_KEY as string,
        owners: (process.env.SAFE_OWNERS || '').split(','),
    }

    console.log(`Starting deployment on ${config.network}...`)

    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl)
    const signer = new ethers.Wallet(config.privateKey, provider)
    const ethAdapter = new EthersAdapter({
        ethers,
        signerOrProvider: signer
    })

    // Deploy Safes for each agent
    const deployments = await deployAgentSafes(ethAdapter, config)

    // Save deployment addresses
    saveDeployment(deployments, config.network)

    console.log('Deployment completed successfully!')
}

async function deployAgentSafes(ethAdapter: EthersAdapter, config: DeploymentConfig) {
    const safeFactory = await SafeFactory.create({ ethAdapter })
    const deployments: Record<string, any> = {}

    // Common Safe configuration
    const threshold = 2 // Requiring 2 signatures for security
    const owners = config.owners

    // Deploy TRAA Safe
    console.log('Deploying TRAA Safe...')
    const traaSafe = await safeFactory.deploySafe({
        safeAccountConfig: {
            owners,
            threshold,
        }
    })
    deployments.TRAA = {
        safeAddress: await traaSafe.getAddress(),
        owners,
        threshold
    }

    // Deploy TLA Safe
    console.log('Deploying TLA Safe...')
    const tlaSafe = await safeFactory.deploySafe({
        safeAccountConfig: {
            owners,
            threshold,
        }
    })
    deployments.TLA = {
        safeAddress: await tlaSafe.getAddress(),
        owners,
        threshold
    }

    // Deploy SIA Safe
    console.log('Deploying SIA Safe...')
    const siaSafe = await safeFactory.deploySafe({
        safeAccountConfig: {
            owners,
            threshold,
        }
    })
    deployments.SIA = {
        safeAddress: await siaSafe.getAddress(),
        owners,
        threshold
    }

    // Deploy CAPE Safe
    console.log('Deploying CAPE Safe...')
    const capeSafe = await safeFactory.deploySafe({
        safeAccountConfig: {
            owners,
            threshold,
        }
    })
    deployments.CAPE = {
        safeAddress: await capeSafe.getAddress(),
        owners,
        threshold
    }

    return deployments
}

function saveDeployment(deployments: Record<string, any>, network: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const deploymentPath = path.join(__dirname, '../deployments')
    
    if (!fs.existsSync(deploymentPath)) {
        fs.mkdirSync(deploymentPath, { recursive: true })
    }

    const filePath = path.join(
        deploymentPath,
        `deployment-${network}-${timestamp}.json`
    )

    fs.writeFileSync(
        filePath,
        JSON.stringify(deployments, null, 2)
    )

    console.log(`Deployment info saved to ${filePath}`)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Deployment failed:', error)
        process.exit(1)
    })
