import { ethers } from 'ethers'
import { EthersAdapter } from '@safe-global/protocol-kit'
import { SafeFactory, SafeAccountConfig } from '@safe-global/protocol-kit'
import Safe, { SafeTransactionDataPartial } from '@safe-global/protocol-kit'
import { SafeTransaction } from '@safe-global/safe-core-sdk-types'

export class SIAContract {
    private safe: Safe
    private signer: ethers.Signer
    
    constructor(signer: ethers.Signer) {
        this.signer = signer
    }

    async initialize(safeAddress?: string) {
        const ethAdapter = new EthersAdapter({
            ethers,
            signerOrProvider: this.signer
        })

        if (safeAddress) {
            this.safe = await Safe.create({ ethAdapter, safeAddress })
        } else {
            const safeFactory = await SafeFactory.create({ ethAdapter })
            const owners = [await this.signer.getAddress()]
            const threshold = 1
            
            const safeAccountConfig: SafeAccountConfig = {
                owners,
                threshold,
            }
            
            this.safe = await safeFactory.deploySafe({ safeAccountConfig })
        }
    }

    async proposeInvestment(
        asset: string,
        amount: string,
        isEntry: boolean
    ): Promise<SafeTransaction> {
        // Create investment transaction (buy or sell)
        const transactionData: SafeTransactionDataPartial = {
            to: asset,
            value: isEntry ? amount : '0',
            data: isEntry ? '0x' : new ethers.utils.Interface([
                'function transfer(address to, uint256 amount)'
            ]).encodeFunctionData('transfer', [await this.safe.getAddress(), amount])
        }

        const safeTransaction = await this.safe.createTransaction({ safeTransactionData: transactionData })
        const signedSafeTransaction = await this.safe.signTransaction(safeTransaction)

        if (this.safe.getThreshold() === 1) {
            await this.safe.executeTransaction(signedSafeTransaction)
        }

        return signedSafeTransaction
    }

    async proposeHedge(
        hedgeContract: string,
        amount: string,
        direction: 'long' | 'short'
    ): Promise<SafeTransaction> {
        const transactionData: SafeTransactionDataPartial = {
            to: hedgeContract,
            value: '0',
            data: new ethers.utils.Interface([
                'function openPosition(uint256 amount, bool isLong)'
            ]).encodeFunctionData('openPosition', [amount, direction === 'long'])
        }

        const safeTransaction = await this.safe.createTransaction({ safeTransactionData: transactionData })
        const signedSafeTransaction = await this.safe.signTransaction(safeTransaction)

        if (this.safe.getThreshold() === 1) {
            await this.safe.executeTransaction(signedSafeTransaction)
        }

        return signedSafeTransaction
    }

    async closePosition(
        hedgeContract: string,
        positionId: string
    ): Promise<SafeTransaction> {
        const transactionData: SafeTransactionDataPartial = {
            to: hedgeContract,
            value: '0',
            data: new ethers.utils.Interface([
                'function closePosition(uint256 positionId)'
            ]).encodeFunctionData('closePosition', [positionId])
        }

        const safeTransaction = await this.safe.createTransaction({ safeTransactionData: transactionData })
        const signedSafeTransaction = await this.safe.signTransaction(safeTransaction)

        if (this.safe.getThreshold() === 1) {
            await this.safe.executeTransaction(signedSafeTransaction)
        }

        return signedSafeTransaction
    }

    async getSafeAddress(): Promise<string> {
        return await this.safe.getAddress()
    }

    async getBalance(): Promise<string> {
        return await this.safe.getBalance()
    }
}
