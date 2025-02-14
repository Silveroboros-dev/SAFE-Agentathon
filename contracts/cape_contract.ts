import { ethers } from 'ethers'
import { EthersAdapter } from '@safe-global/protocol-kit'
import { SafeFactory, SafeAccountConfig } from '@safe-global/protocol-kit'
import Safe, { SafeTransactionDataPartial } from '@safe-global/protocol-kit'
import { SafeTransaction } from '@safe-global/safe-core-sdk-types'

export class CAPEContract {
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

    async requestCollateralCall(
        counterparty: string,
        amount: string,
        deadline: number
    ): Promise<SafeTransaction> {
        const transactionData: SafeTransactionDataPartial = {
            to: counterparty,
            value: '0',
            data: new ethers.utils.Interface([
                'function collateralCall(uint256 amount, uint256 deadline)'
            ]).encodeFunctionData('collateralCall', [amount, deadline])
        }

        const safeTransaction = await this.safe.createTransaction({ safeTransactionData: transactionData })
        const signedSafeTransaction = await this.safe.signTransaction(safeTransaction)

        if (this.safe.getThreshold() === 1) {
            await this.safe.executeTransaction(signedSafeTransaction)
        }

        return signedSafeTransaction
    }

    async reduceExposure(
        counterparty: string,
        amount: string,
        asset: string
    ): Promise<SafeTransaction> {
        const transactionData: SafeTransactionDataPartial = {
            to: asset,
            value: '0',
            data: new ethers.utils.Interface([
                'function transfer(address to, uint256 amount)'
            ]).encodeFunctionData('transfer', [counterparty, amount])
        }

        const safeTransaction = await this.safe.createTransaction({ safeTransactionData: transactionData })
        const signedSafeTransaction = await this.safe.signTransaction(safeTransaction)

        if (this.safe.getThreshold() === 1) {
            await this.safe.executeTransaction(signedSafeTransaction)
        }

        return signedSafeTransaction
    }

    async updateCounterpartyLimits(
        limitsContract: string,
        counterparty: string,
        newLimit: string
    ): Promise<SafeTransaction> {
        const transactionData: SafeTransactionDataPartial = {
            to: limitsContract,
            value: '0',
            data: new ethers.utils.Interface([
                'function updateLimit(address counterparty, uint256 newLimit)'
            ]).encodeFunctionData('updateLimit', [counterparty, newLimit])
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
