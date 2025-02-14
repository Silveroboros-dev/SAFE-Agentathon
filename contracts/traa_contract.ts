import { ethers } from 'ethers'
import { EthersAdapter } from '@safe-global/protocol-kit'
import { SafeFactory, SafeAccountConfig } from '@safe-global/protocol-kit'
import Safe, { SafeTransactionDataPartial } from '@safe-global/protocol-kit'
import { SafeTransaction } from '@safe-global/safe-core-sdk-types'

export class TRAAContract {
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
            // Load existing Safe
            this.safe = await Safe.create({ ethAdapter, safeAddress })
        } else {
            // Deploy new Safe
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

    async proposeRiskMitigation(
        asset: string,
        amount: string,
        recipientAddress: string
    ): Promise<SafeTransaction> {
        // Create transaction data for risk mitigation (e.g., reducing position)
        const transactionData: SafeTransactionDataPartial = {
            to: asset,
            value: '0',
            data: new ethers.utils.Interface([
                'function transfer(address to, uint256 amount)'
            ]).encodeFunctionData('transfer', [recipientAddress, amount])
        }

        // Create and sign transaction
        const safeTransaction = await this.safe.createTransaction({ safeTransactionData: transactionData })
        const signedSafeTransaction = await this.safe.signTransaction(safeTransaction)

        // Execute transaction if threshold is 1, otherwise it needs more signatures
        if (this.safe.getThreshold() === 1) {
            await this.safe.executeTransaction(signedSafeTransaction)
        }

        return signedSafeTransaction
    }

    async getBalance(): Promise<string> {
        return await this.safe.getBalance()
    }

    async getSafeAddress(): Promise<string> {
        return await this.safe.getAddress()
    }

    async getOwners(): Promise<string[]> {
        return await this.safe.getOwners()
    }
}
