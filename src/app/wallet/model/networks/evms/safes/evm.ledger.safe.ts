// eslint-disable-next-line @typescript-eslint/no-var-requires
import type { TxData } from "@ethereumjs/tx";
import BluetoothTransport from "src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport";
import { Logger } from "src/app/logger";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { EVMService } from "src/app/wallet/services/evm/evm.service";
import { WalletUIService } from "src/app/wallet/services/wallet.ui.service";
import { LedgerAccountType } from "../../../ledger.types";
import { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import { LedgerSafe } from "../../../safes/ledger.safe";
import { SignTransactionResult } from "../../../safes/safe.types";
import { AnySubWallet } from "../../base/subwallets/subwallet";
import { EVMSafe } from "./evm.safe";

/**
 * Safe specialized for EVM networks, with additional methods.
 */
export class EVMLedgerSafe extends LedgerSafe implements EVMSafe {
    private evmAddress = null;
    private addressPath = '';
    private signedTx = null;
    private unsignedTx = null;
    private txData: TxData = null;
    private common = null;

    constructor(protected masterWallet: LedgerMasterWallet, protected chainId: number) {
        super(masterWallet);

        this.initEVMAddress();
    }

    initEVMAddress() {
        if (this.masterWallet.accountOptions) {
            let evmOption = this.masterWallet.accountOptions.find((option) => {
                return option.type === LedgerAccountType.EVM
            })
            if (evmOption) {
                this.evmAddress = evmOption.accountID;
                this.addressPath = evmOption.accountPath;
            }
        }
    }

    public getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<string[]> {
        if (this.evmAddress) {
            return Promise.resolve([this.evmAddress]);
        }
        else {
            throw new Error("EVMLedgerSafe: No evm address.");
        }
    }

    public createTransferTransaction(toAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
        return EVMService.instance.createUnsignedTransferTransaction(toAddress, amount, gasPrice, gasLimit, nonce);
    }

    public createContractTransaction(contractAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number, data: any): Promise<any> {
        return EVMService.instance.createUnsignedContractTransaction(contractAddress, amount, gasPrice, gasLimit, nonce, data);
    }

    public personalSign(): string {
        throw new Error("Method not implemented.");
    }

    public async signTransaction(subWallet: AnySubWallet, txData: TxData, transfer: Transfer): Promise<SignTransactionResult> {
        Logger.log('wallet', "EVMLedgerSafe::signTransaction chainId:", this.chainId);
        let signTransactionResult: SignTransactionResult = {
            signedTransaction: null
        }

        await this.initCommon();
        await this.createEthereumTx(txData)

        // Wait for the ledger sign the transaction.
        let signed = await WalletUIService.instance.connectLedgerAndSignTransaction(this.masterWallet.deviceID, this)
        if (!signed) {
            Logger.log('wallet', "EVMLedgerSafe::signTransaction can't connect to ledger or user canceled");
            return signTransactionResult;
        }

        signTransactionResult.signedTransaction = this.signedTx.serialize().toString('hex');
        return signTransactionResult;
    }

    public async signTransactionByLedger(transport: BluetoothTransport): Promise<void> {
        Logger.log('wallet', "EVMLedgerSafe::signTransactionByLedger");

        const AppEth = (await import("@ledgerhq/hw-app-eth")).default;
        const eth = new AppEth(transport);
        const ret = await eth.signTransaction(this.addressPath, this.unsignedTx);
        let v = Buffer.from(ret.v, "hex");
        let r = Buffer.from(ret.r, "hex");
        let s = Buffer.from(ret.s, "hex")

        this.txData = { ...this.txData, v, r, s }
        const Transaction = (await import("@ethereumjs/tx")).Transaction;
        this.signedTx = Transaction.fromTxData(this.txData, { common: this.common })
    }

    private async initCommon() {
      if (!this.common) {
        const Common = (await import('@ethereumjs/common')).default;
        this.common = Common.custom({ chainId: this.chainId })
      }
    }

    private async createEthereumTx(txData: TxData): Promise<void> {
        this.txData = txData;

        const Transaction = (await import("@ethereumjs/tx")).Transaction;
        let tx = Transaction.fromTxData(txData, { common: this.common });
        let unsignedTx = tx.getMessageToSign(false)

        const rlp = (await import("ethereumjs-util")).rlp
        this.unsignedTx = rlp.encode(unsignedTx)
        Logger.log('ledger', "EVMLedgerSafe::createEthereumTx", this.unsignedTx);
    }
}