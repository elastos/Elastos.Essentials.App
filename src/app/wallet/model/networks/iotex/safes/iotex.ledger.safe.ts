import { from } from "@iotexproject/iotex-address-ts";
import { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import { AddressUsage } from "../../../safes/addressusage";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMLedgerSafe } from "../../evms/safes/evm.ledger.safe";

export class IotexLedgerSafe extends EVMLedgerSafe {
  protected iotexAddress: string = null; // TODO: persistence to not prompt password every time

  constructor(protected masterWallet: LedgerMasterWallet, protected chainId: number) {
    super(masterWallet, chainId);
  }

  public async initialize(networkWallet: AnyNetworkWallet): Promise<void> {
    const addr = from(this.evmAddress);
    this.iotexAddress = addr.string();
  }

  public getAddresses(startIndex: number, count: number, internalAddresses: boolean, usage: AddressUsage | string): string[] {
    if (usage === AddressUsage.IOTEX || usage === AddressUsage.RECEIVE_FUNDS || usage === AddressUsage.SEND_FUNDS)
      return [this.iotexAddress];
    else
      return [this.evmAddress];
  }
}