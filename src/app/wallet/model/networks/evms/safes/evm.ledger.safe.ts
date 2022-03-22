import AppEth from "@ledgerhq/hw-app-eth";
import { Transaction as EthereumTx, TxData } from "ethereumjs-tx";
import BluetoothTransport from "src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport";
import { Logger } from "src/app/logger";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { WalletUIService } from "src/app/wallet/services/wallet.ui.service";
import Web3 from "web3";
import { LeddgerAccountType } from "../../../ledger.types";
import { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import { LedgerSafe } from "../../../safes/ledger.safe";
import { SignTransactionResult } from "../../../safes/safe.types";
import { EVMSafe } from "./evm.safe";
// eslint-disable-next-line @typescript-eslint/no-var-requires
var Common = require('ethereumjs-common').default;

/**
 * Safe specialized for EVM networks, with additional methods.
 */
 export class EVMLedgerSafe extends LedgerSafe implements EVMSafe {
    private evmAddress = null;
    private addressPath = '';
    private evmTx: EthereumTx = null;

    constructor(protected masterWallet: LedgerMasterWallet, protected chainId: number) {
        super(masterWallet);

        this.initEVMAddress();
    }

    initEVMAddress() {
        if (this.masterWallet.accountOptions) {
            let evmOption = this.masterWallet.accountOptions.find( (option)=> {
                return option.type ===  LeddgerAccountType.EVM
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
            throw new Error("EVMSafe: No evm address.");
        }
    }

    public createTransferTransaction(toAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
        let web3 = new Web3();
        const txData: TxData = {
            nonce: web3.utils.toHex(nonce),
            gasLimit: web3.utils.toHex(gasLimit),
            gasPrice: web3.utils.toHex(gasPrice),
            to: toAddress,
            value: web3.utils.toHex(web3.utils.toWei(amount.toString())),
        }
        Logger.log('wallet', 'EVMSafe::createTransferTransaction:', txData);
        return Promise.resolve(txData);
    }

    public personalSign(): string {
        throw new Error("Method not implemented.");
    }

    public async signTransaction(txData: TxData, transfer: Transfer): Promise<SignTransactionResult> {
        Logger.log('ledger', "EVMSafe::signTransaction chainId:", this.chainId);
        let signTransactionResult: SignTransactionResult = {
            signedTransaction : null
        }

        this.createEthereumTx(txData)

        // Wait for the ledger sign the transaction.
        let signed = await WalletUIService.instance.connectLedger(this.masterWallet.deviceID, this)
        if (!signed) {
            Logger.log('ledger', "EVMSafe::signTransaction can't connect to ledger or user canceled");
            return signTransactionResult;
        }

        let signedTx = {
            TxSigned: this.evmTx.serialize().toString('hex')
        }
        signTransactionResult.signedTransaction  = JSON.stringify(signedTx)
        return signTransactionResult;
    }

    public async signTransactionByLedger(transport: BluetoothTransport) {
        let unsignedTx = this.evmTx.serialize().toString('hex')

        const eth = new AppEth(transport);
        // TODO: use the right HD derivation path.
        const r = await eth.signTransaction(this.addressPath, unsignedTx);

        this.evmTx.v = Buffer.from(r.v, "hex");
        this.evmTx.r = Buffer.from(r.r, "hex");
        this.evmTx.s = Buffer.from(r.s, "hex");
    }

    private createEthereumTx(txData: TxData) {
        let common = Common.forCustomChain(
            'mainnet',
            {chainId: this.chainId},
            'petersburg'
        );
        this.evmTx = new EthereumTx(txData, {'common': common});

        // Set the EIP155 bits
        this.evmTx.raw[6] = Buffer.from([this.chainId]); // v
        this.evmTx.raw[7] = Buffer.from([]); // r
        this.evmTx.raw[8] = Buffer.from([]); // s
    }
}