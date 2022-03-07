import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { LeddgerAccountType } from "../../../ledger.types";
import { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import { Safe } from "../../../safes/safe";
import { SignTransactionResult } from "../../../safes/safe.types";
/**
 * Safe specialized for EVM networks, with additional methods.
 */
export class EVMSafe extends Safe {
    private evmAddress = null;
    constructor(protected masterWallet: LedgerMasterWallet) {
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

    public personalSign(): string {
        throw new Error("Method not implemented.");
    }

    public signTransaction(rawTx: string, transfer: Transfer): Promise<SignTransactionResult> {

        // TODO: @zhiming call hw-app-eth from ledger here

        throw new Error("Method not implemented.");
    }
}