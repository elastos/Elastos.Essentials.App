import { lazyTronWebImport } from "src/app/helpers/import.helper";
import { Logger } from "src/app/logger";
import { AuthService } from "src/app/wallet/services/auth.service";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { Safe } from "../../../safes/safe";
import { SignTransactionResult } from "../../../safes/safe.types";
import { WalletUtil } from '../../../wallet.util';
import { NetworkAPIURLType } from "../../base/networkapiurltype";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { TronSafe } from './tron.safe';


export class TronWalletJSSafe extends Safe implements TronSafe {
    private tronAddress = null;
    private tronWeb = null;

    constructor(protected masterWallet: StandardMasterWallet, protected chainId: string) {
        super(masterWallet);
    }

    public async initialize(networkWallet: AnyNetworkWallet): Promise<void> {
        await super.initialize(networkWallet);

        // Check if the address is already computed or not  (first time). If not, request the
        // master password to compute it
        this.tronAddress = await networkWallet.loadContextInfo("tronAddress");
        if (!this.tronAddress) {
          await this.initJSWallet()

          if (this.tronAddress)
            await networkWallet.saveContextInfo("tronAddress", this.tronAddress);
        }
    }

    private async initJSWallet() {
        try {
            let privateKey = await this.getPrivateKey();
            if (privateKey) {
                await this.initTronWeb()
                this.tronWeb.setPrivateKey(privateKey.startsWith('0x') ? privateKey.substring(2) : privateKey)
                this.tronAddress = this.tronWeb.defaultAddress.base58;
            }

        } catch (e) {
            Logger.warn('wallet', 'TronWalletJSSafe initJSWallet exception:', e)
        }
    }

    private async initTronWeb() {
        if (this.tronWeb) return;

        const TronWeb = await lazyTronWebImport();
        this.tronWeb = new TronWeb({
            fullHost: this.networkWallet.network.getAPIUrlOfType(NetworkAPIURLType.RPC),
            privateKey: '01'
        })
    }

    private async getPrivateKey(forceShowMasterPrompt = false) {
        // No data - need to compute
        let payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id, true, forceShowMasterPrompt);
        if (!payPassword)
            return null; // Can't continue without the wallet password - cancel the initialization

        try {
            let privateKey: string = null;
            let seed = await (this.masterWallet as StandardMasterWallet).getSeed(payPassword);
            if (seed) {
                let jsWallet = await WalletUtil.getWalletFromSeed(seed);
                privateKey = jsWallet.privateKey;
            }
            else {
                // No mnemonic - check if we have a private key instead
                privateKey = await (this.masterWallet as StandardMasterWallet).getPrivateKey(payPassword);
            }

            return privateKey;
        } catch (e) {
            Logger.warn('wallet', 'TronWalletJSSafe getPrivateKey exception:', e)
            return null;
        }
    }

    public getAddresses(startIndex: number, count: number, internalAddresses: boolean): string[] {
        return [this.tronAddress];
    }

    createContractTransaction(contractAddress: string, amount: string, data: any): Promise<any> {
        return Promise.resolve([]);
    }

    async createTransferTransaction(toAddress: string, amount: string): Promise<any> {
        await this.initTronWeb();
        let amountSun = this.tronWeb.toSun(amount);
        return this.tronWeb.transactionBuilder.sendTrx(
            toAddress, amountSun, this.tronAddress
        );
    }

    public async signTransaction(subWallet: AnySubWallet, rawTransaction: any, transfer: Transfer): Promise<SignTransactionResult> {
        let signTransactionResult: SignTransactionResult = {
            signedTransaction: null
        }
        Logger.log('wallet', 'TronWalletJSSafe signTransaction ', rawTransaction)

        try {
            let privateKey = await this.getPrivateKey(true);
            if (privateKey) {
                await this.initTronWeb();
                let signedTxn = await this.tronWeb.trx.sign(rawTransaction, privateKey.startsWith('0x') ? privateKey.substring(2) : privateKey);
                if (signedTxn) {
                    signTransactionResult.signedTransaction = signedTxn;
                }
            }
        } catch (e) {
            Logger.warn('wallet', 'TronWalletJSSafe signTransaction exception:', e)
        }

        return signTransactionResult;
    }
}