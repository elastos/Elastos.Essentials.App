import { Logger } from "src/app/logger";
import { Util } from "src/app/model/util";
import { Config } from "src/app/wallet/config/Config";
import { EVMSafe } from "../../../../evms/safes/evm.safe";
import { EVMTransactionBuilder } from "../../../../evms/tx-builders/evm.txbuilder";

const claimBPoSNFTAbi = [
    {
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
    }
];

export class ESCTransactionBuilder extends EVMTransactionBuilder {

    /**
     *
     * @param elaHash: 主链上Mint BPoS NFT交易txid，传递时需要按字节进行revert, 0x 开头
     * @param to: 生成签名数据时传递的receiver_address, 0x 开头
     * @param signatures: 是前一个步骤中生成的签名数据, 0x 开头
     * @param publicKey: publicKeys为主链钱包的公钥，如是多签钱包，则为每个多签参与钱包的第一个外部地址的公钥；0x 开头
     * @param multi_m: 签名个数，单签钱包是1，多签钱包是最少签名数量
     * @param gasPriceArg
     * @param gasLimitArg
     * @returns
     */
    public async createClaimBPoSNFTTransaction(elaHash: string, to: string, signature: string, publicKey: string, multi_m: number, gasPriceArg: string = null, gasLimitArg: string = null): Promise<string> {
        const claimBPoSNFTContract = new ((await this.getWeb3()).eth.Contract)(claimBPoSNFTAbi as any, Config.ETHSC_CLAIMNFT_CONTRACTADDRESS);

        claimBPoSNFTContract.options.address = to;// can remove it?

        const method = claimBPoSNFTContract.methods.claim(elaHash, to, [signature], [publicKey], multi_m);

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

    public async estimateGas(elaHash: string, to: string, signatures: string, publicKey: string, multi_m: number, gasPriceArg: string = null, gasLimitArg: string = null) {
        const claimBPoSNFTContract = new ((await this.getWeb3()).eth.Contract)(claimBPoSNFTAbi as any, Config.ETHSC_CLAIMNFT_CONTRACTADDRESS);
        claimBPoSNFTContract.options.address = to;// can remove it?
        const method = claimBPoSNFTContract.methods.claim(elaHash, to, [signatures], [publicKey], multi_m);
        return await this.estimateGasByMethod(method);
    }

    private async estimateGasByMethod(method) {
        let gasLimit = 1500000;
        try {
            // Estimate gas cost
            let gasLimitTemp = await method.estimateGas();
            //'* 1.5': Make sure the gaslimit is big enough.
            gasLimit = Util.ceil(gasLimitTemp * 1.5);

            // TODO: estimateGas return the wrong value.
            if (gasLimit < 1500000) {
                gasLimit = 1500000;
                Logger.warn('wallet', 'ESCTransactionBuilder: The value returned by estimateGas is too small, using the default value 1500000');
            }
        } catch (error) {
            Logger.warn('wallet', 'ESCTransactionBuilder estimateGas error:', error);
        }
        return gasLimit.toString();
    }
}