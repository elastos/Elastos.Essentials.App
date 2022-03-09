import AppEth from "@ledgerhq/hw-app-eth";
import { Transaction as EthereumTx, TxData } from "ethereumjs-tx";
import BluetoothTransport from "src/app/helpers/ledger/hw-transport-cordova-ble/src/BleTransport";
import { Logger } from "src/app/logger";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import Web3 from "web3";
import { LeddgerAccountType } from "../../../ledger.types";
import { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import { Safe } from "../../../safes/safe";
import { SignTransactionResult } from "../../../safes/safe.types";
// eslint-disable-next-line @typescript-eslint/no-var-requires
var Common = require('ethereumjs-common').default;

/**
 * Safe specialized for EVM networks, with additional methods.
 */
export class EVMSafe extends Safe {
    private evmAddress = null;
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

    public createTransfer(toAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
        let web3 = new Web3();
        const txData: TxData = {
            nonce: web3.utils.toHex(nonce),
            gasLimit: web3.utils.toHex(gasLimit),
            gasPrice: web3.utils.toHex(gasPrice),
            to: toAddress,
            value: web3.utils.toHex(web3.utils.toWei(amount.toString())),
        }
        Logger.log('wallet', 'EVMSafe::createTransfer:', txData);
        return Promise.resolve(txData);
      }

    public personalSign(): string {
        throw new Error("Method not implemented.");
    }

    public async signTransaction(txData: TxData, transfer: Transfer): Promise<SignTransactionResult> {
        Logger.log('ledger', "EVMSafe::signTransaction chainId:", this.chainId);
        let common = Common.forCustomChain(
            'mainnet',
            {chainId: this.chainId},
            'petersburg'
        );
        let tx = new EthereumTx(txData, {'common': common});

        // Set the EIP155 bits
        tx.raw[6] = Buffer.from([this.chainId]); // v
        tx.raw[7] = Buffer.from([]); // r
        tx.raw[8] = Buffer.from([]); // s

        let serializedTx = tx.serialize().toString('hex')

        // Wait for the ledger and create the transport
        // TODO: show a popup, wait for connect to ledger.

        let transport = await BluetoothTransport.open(this.masterWallet.deviceID);
        Logger.log('ledger', "transport:", transport);

        const eth = new AppEth(transport);
        const r = await eth.signTransaction("44'/60'/0'/0/0", serializedTx);

        transport.close();

        tx.v = Buffer.from(r.v, "hex");
        tx.r = Buffer.from(r.r, "hex");
        tx.s = Buffer.from(r.s, "hex");

        let signedTx = {
            TxSigned: tx.serialize().toString('hex')
        }
        let signTransactionResult: SignTransactionResult = {
            signedTransaction : JSON.stringify(signedTx)
        }
        Logger.warn('ledger', "signTransaction tx :", signTransactionResult.signedTransaction);
        return Promise.resolve(signTransactionResult);
    }
}