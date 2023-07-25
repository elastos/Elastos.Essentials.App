import { Logger } from "src/app/logger";
import { Util } from "src/app/model/util";
import { Config } from "src/app/wallet/config/Config";
import { EVMSafe } from "../../../../evms/safes/evm.safe";
import { EVMTransactionBuilder } from "../../../../evms/tx-builders/evm.txbuilder";

const claimBPoSNFTAbi = [{
    "inputs": [
        {
            "internalType": "bytes32",
            "name": "elaHash",
            "type": "bytes32"
        },
        {
            "internalType": "address",
            "name": "to",
            "type": "address"
        },
        {
            "internalType": "bytes[]",
            "name": "signatures",
            "type": "bytes[]"
        },
        {
            "internalType": "bytes[]",
            "name": "publicKeys",
            "type": "bytes[]"
        },
        {
            "internalType": "uint256",
            "name": "multi_m",
            "type": "uint256"
        }
    ],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
}];

const burnTickAbi = [{
  "inputs": [
    {
      "internalType": "uint256",
      "name": "tokenId",
      "type": "uint256"
    },
    {
      "internalType": "string",
      "name": "saddress",
      "type": "string"
    }
  ],
  "name": "burnTick",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
}];

export class ESCTransactionBuilder extends EVMTransactionBuilder {

    /**
     *
     * @param elaHash: Mint BPoS NFT transaction txid on the main chain needs to be reversed in bytes, starting with 0x
     * @param to: Receiver passed when generating signature data_ Address, starting with 0x
     * @param signatures:
     * @param publicKeys: Public key corresponding to the main chain wallet stake address
     * @param multi_m: The number of signatures is 1 for a single signed wallet, and the minimum number of signatures is for multiple signed wallets
     * @param gasPriceArg
     * @param gasLimitArg
     * @returns
     */
    public async createClaimBPoSNFTTransaction(elaHash: string, to: string, signatures: string, publicKeys: string, multi_m: number, gasPriceArg: string = null, gasLimitArg: string = null): Promise<string> {
        Logger.log('wallet', 'createClainBPoSNFTTransaction tx:', {elaHash, to, signatures, publicKeys, multi_m});

        const claimBPoSNFTContract = new ((await this.getWeb3()).eth.Contract)(claimBPoSNFTAbi as any, Config.ETHSC_CLAIMNFT_CONTRACTADDRESS);
        const method = claimBPoSNFTContract.methods.claim(elaHash, to, [signatures], [publicKeys], multi_m);

        let gasPrice = gasPriceArg;
        if (gasPrice === null) {
            gasPrice = await this.getGasPrice();
        }

        let gasLimit = gasLimitArg;
        if (gasLimit === null) {
            gasLimit = await this.estimateGasByMethod(method);
        }

        let nonce = await this.getNonce();
        Logger.log('wallet', 'createClainBPoSNFTTransaction gasPrice:', gasPrice, ' nonce:', nonce, ' ContractAddress:', Config.ETHSC_CLAIMNFT_CONTRACTADDRESS);

        return (this.networkWallet.safe as unknown as EVMSafe).createContractTransaction(Config.ETHSC_CLAIMNFT_CONTRACTADDRESS, '0', gasPrice, gasLimit, nonce, method.encodeABI());
    }

    public async estimateClaimBPoSNFTGas(elaHash: string, to: string, signature: string, publicKey: string, multi_m: number, gasPriceArg: string = null, gasLimitArg: string = null) {
        const claimBPoSNFTContract = new ((await this.getWeb3()).eth.Contract)(claimBPoSNFTAbi as any, Config.ETHSC_CLAIMNFT_CONTRACTADDRESS);

        const method = claimBPoSNFTContract.methods.claim(elaHash, to, [signature], [publicKey], multi_m);
        Logger.log('wallet', 'estimateClaimBPoSNFTGas method:', method, claimBPoSNFTContract)
        return await this.estimateGasByMethod(method);
    }

    /**
     *
     * @param tokenId:
     * @param stakeAddress: the stake address of the ela main chain subwallet.
     * @param gasPriceArg
     * @param gasLimitArg
     * @returns
     */
    public async burnBPoSNFT(tokenId: string, stakeAddress: string, gasPriceArg: string = null, gasLimitArg: string = null) {
        Logger.log('wallet', 'burnBPoSNFT token id:', tokenId, stakeAddress)

        const burnTickContract = new ((await this.getWeb3()).eth.Contract)(burnTickAbi, Config.ETHSC_CLAIMNFT_CONTRACTADDRESS);
        const method = await burnTickContract.methods.burnTick(tokenId, stakeAddress);

        let gasPrice = gasPriceArg;
        if (gasPrice === null) {
            gasPrice = await this.getGasPrice();
        }

        let gasLimit = gasLimitArg;
        if (gasLimit === null) {
            gasLimit = await this.estimateGasByMethod(method);
        }

        let nonce = await this.getNonce();
        Logger.log('wallet', 'burnBPoSNFT gasPrice:', gasPrice, ' nonce:', nonce, ' ContractAddress:', Config.ETHSC_CLAIMNFT_CONTRACTADDRESS);

        return (this.networkWallet.safe as unknown as EVMSafe).createContractTransaction(Config.ETHSC_CLAIMNFT_CONTRACTADDRESS, '0', gasPrice, gasLimit, nonce, method.encodeABI());
    }

    private async estimateGasByMethod(method) {
        let gasLimit = 1500000;
        try {
            // Estimate gas cost
            let gasLimitTemp = await method.estimateGas();
            //'* 1.5': Make sure the gaslimit is big enough.
            gasLimit = Util.ceil(gasLimitTemp * 1.5);
        } catch (error) {
            Logger.warn('wallet', 'ESCTransactionBuilder estimateGas error:', error);
        }
        return gasLimit.toString();
    }
}