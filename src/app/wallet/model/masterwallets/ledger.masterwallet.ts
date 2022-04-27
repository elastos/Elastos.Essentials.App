import { Logger } from "src/app/logger";
import { LeddgerAccountType } from "../ledger.types";
import { AnyNetwork } from "../networks/network";
import { MasterWallet } from "./masterwallet";
import { ElastosMainChainWalletNetworkOptions, LedgerAccountOptions, SerializedLedgerMasterWallet } from "./wallet.types";

export class LedgerMasterWallet extends MasterWallet {
  public deviceID = '';
  public accountOptions: LedgerAccountOptions[] = [];

  public static newFromSerializedWallet(serialized: SerializedLedgerMasterWallet): LedgerMasterWallet {
    let masterWallet = new LedgerMasterWallet();

    let elastosNetworkOptions: ElastosMainChainWalletNetworkOptions = {
      network: "elastos", // mainchain
      singleAddress: true
    };

    serialized.networkOptions = [elastosNetworkOptions]

    // Base type deserialization
    masterWallet.deserialize(serialized);
    Logger.warn('wallet', 'LedgerMasterWallet newFromSerializedWallet serialized:', serialized, 'masterWallet:', masterWallet)
    return masterWallet;
  }

  protected deserialize(serialized: SerializedLedgerMasterWallet) {
    super.deserialize(serialized);

    // TODO: ledger specific data
    this.deviceID = serialized.deviceID;

    this.accountOptions = serialized.accountOptions;
  }

  public serialize(): SerializedLedgerMasterWallet {
    let serialized: SerializedLedgerMasterWallet = {} as SerializedLedgerMasterWallet; // Force empty

    super._serialize(serialized as SerializedLedgerMasterWallet);

    // TODO: ledger specific data
    serialized.deviceID = this.deviceID;
    serialized.accountOptions = this.accountOptions;
    return serialized;
  }

  public addAccountOptions(accountOptions: LedgerAccountOptions) {
    if (this.accountOptions.findIndex(n => n.type === accountOptions.type) >= 0) {
      Logger.warn('wallet', 'LedgerMasterWallet: This account already exists!');
      return;
    }
    this.accountOptions.push(accountOptions);
  }

  public hasMnemonicSupport(): boolean {
    return false; // TODO - this hasMnemonicSupport() doesn't make enough sense, what does this mean?
  }

  public supportsNetwork(network: AnyNetwork): boolean {
    let accountType: LeddgerAccountType;
    switch (network.key.toLowerCase()) {
      case 'elastos':
        accountType = LeddgerAccountType.ELA
        break;
      case 'btc':
        accountType = LeddgerAccountType.BTC
        break;
      default:
        accountType = LeddgerAccountType.EVM
        break;
    }

    if (this.accountOptions.findIndex(n => n.type === accountType) >= 0) {
      return true;
    }
    return false;
  }

  public async destroy() {
      // Do nothing
  }
}
