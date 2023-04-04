import { Slip10, Slip10Curve, stringToPath } from '@cosmjs/crypto';
import { DirectSecp256k1Wallet } from "@cosmjs/proto-signing";
import { GasPrice, SearchTxFilter, SigningStargateClient } from '@cosmjs/stargate';
import type { json } from "@elastosfoundation/wallet-js-sdk";
import { Logger } from "src/app/logger";
import { AuthService } from "src/app/wallet/services/auth.service";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { EVMService } from "src/app/wallet/services/evm/evm.service";
import { WalletService } from "src/app/wallet/services/wallet.service";
import { StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { Safe } from "../../../safes/safe";
import { SignTransactionResult } from "../../../safes/safe.types";
import { NetworkAPIURLType } from '../../base/networkapiurltype';
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { CosmosSafe } from "./cosmos.safe";
/**
 * Safe specialized for cosmos networks, with additional methods.
 */
export class CosmosWalletJSSafe extends Safe implements CosmosSafe {
    private wallet: DirectSecp256k1Wallet = null;
    private cosmosAddress = null;
    private signingStargateClient: SigningStargateClient = null;

    constructor(protected masterWallet: StandardMasterWallet, protected addressPrefix: string, protected hdPath: string) {
        super(masterWallet);
    }

    public async initialize(networkWallet: AnyNetworkWallet): Promise<void> {
        await super.initialize(networkWallet);

        // Check if the address is already computed or not  (first time). If not, request the
        // master password to compute it
        this.cosmosAddress = await networkWallet.loadContextInfo("cosmosAddress");
        if (!this.cosmosAddress) {
            await this.initJSWallet();
            if (this.cosmosAddress)
                await networkWallet.saveContextInfo("cosmosAddress", this.cosmosAddress);
        }
    }

    private async initJSWallet() {
        if (this.wallet) return;

        let privateKey = await this.getPrivateKey();
        if (privateKey) {
            this.wallet = await DirectSecp256k1Wallet.fromKey(privateKey, this.addressPrefix);
            const [account] = await this.wallet.getAccounts()
            this.cosmosAddress = account.address;
        }
    }

    private async initClient() {
        if (this.signingStargateClient) return;

        await this.initJSWallet();

        let rpcUrl = this.networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.RPC);
        // TODO: Unfixed gasPrice.
        this.signingStargateClient = await SigningStargateClient.connectWithSigner(
                rpcUrl, this.wallet, { gasPrice: GasPrice.fromString('0.025uatom') });
    }

    private async getPrivateKey(forceShowMasterPrompt = false) {
        // No data - need to compute
        let payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id, true, forceShowMasterPrompt);
        if (!payPassword)
            return null; // Can't continue without the wallet password - cancel the initialization

        try {
            let privateKey = null;
            let seed = await (this.masterWallet as StandardMasterWallet).getSeed(payPassword);
            if (seed) {
                const { privkey } = Slip10.derivePath(Slip10Curve.Secp256k1, Buffer.from(seed, 'hex'), stringToPath(this.hdPath));
                privateKey = privkey;
            }
            else {
                // No mnemonic - check if we have a private key instead
                privateKey = await (this.masterWallet as StandardMasterWallet).getPrivateKey(payPassword);
            }

            return privateKey;
        } catch (e) {
            Logger.warn('wallet', 'CosmosWalletJSSafe getPrivateKey exception:', e)
            return null;
        }
    }

    public getAddresses(startIndex: number, count: number, internalAddresses: boolean): string[] {
        return [this.cosmosAddress];
    }

    public async getAllBalance() {
        await this.initClient();
        return await this.signingStargateClient.getAllBalances(this.cosmosAddress);
    }

    public createTransferTransaction(toAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
        return EVMService.instance.createUnsignedTransferTransaction(toAddress, amount, gasPrice, gasLimit, nonce);
    }

    public createContractTransaction(contractAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number, data: any): Promise<any> {
        return EVMService.instance.createUnsignedContractTransaction(contractAddress, amount, gasPrice, gasLimit, nonce, data);
    }

    public async signTransaction(subWallet: AnySubWallet, rawTransaction: json, transfer: Transfer, forcePasswordPrompt = true, visualFeedback = true): Promise<SignTransactionResult> {
        Logger.log('wallet', ' signTransaction rawTransaction', rawTransaction)

        let payPassword: string;
        if (forcePasswordPrompt) {
            payPassword = await WalletService.instance.openPayModal(transfer);
        }
        else {
            payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id, true, false); // Don't force password
        }

        let signedTx = null;
        // if (!payPassword)
        // return { signedTransaction: signedTx };

        // await this.initJSWallet();

        // if (this.account) {
        // let signdTransaction = await this.account.signTransaction(rawTransaction)
        // signedTx = signdTransaction.rawTransaction;
        // }
        return { signedTransaction: signedTx };
    }

    public async searchTx(filter?: SearchTxFilter) {
        await this.initClient();
        return this.signingStargateClient.searchTx({ sentFromOrTo: this.cosmosAddress}, filter)
    }
}