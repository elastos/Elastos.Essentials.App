import { lazyTronWebImport } from "src/app/helpers/import.helper";
import { Logger } from "src/app/logger";
import { AuthService } from "src/app/wallet/services/auth.service";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { Safe } from "../../../safes/safe";
import { SignTransactionResult } from "../../../safes/safe.types";
import { WalletUtil } from '../../../wallet.util';
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { TronSafe } from './tron.safe';


export class TronWalletJSSafe extends Safe implements TronSafe {
    private tronAddress = null;

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
        // No data - need to compute
        let payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id);
        if (!payPassword)
            return; // Can't continue without the wallet password - cancel the initialization

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

            if (privateKey) {
                const TronWeb = await lazyTronWebImport();
                const tronWeb = new TronWeb({
                    fullHost: 'https://api.trongrid.io/',
                    privateKey: privateKey.startsWith('0x') ? privateKey.substring(2) : privateKey
                })
                this.tronAddress = tronWeb.defaultAddress.base58;
            }

        } catch (e) {
            Logger.warn('wallet', 'initJSWallet exception:', e)
        }
    }

    public getAddresses(startIndex: number, count: number, internalAddresses: boolean): string[] {
        return [this.tronAddress];
    }

    createContractTransaction(contractAddress: string, amount: string, data: any): Promise<any> {
        return Promise.resolve([]);
    }

    createTransferTransaction(toAddress: string, amount: string): Promise<any> {
        return Promise.resolve([]);
    }

    public async signTransaction(subWallet: AnySubWallet, rawTransaction: any, transfer: Transfer): Promise<SignTransactionResult> {
        let signTransactionResult: SignTransactionResult = {
            signedTransaction: null
        }
        //TODO
        Logger.log('wallet', 'TronWalletJSSafe signTransaction ', rawTransaction)

        return signTransactionResult;
    }
}