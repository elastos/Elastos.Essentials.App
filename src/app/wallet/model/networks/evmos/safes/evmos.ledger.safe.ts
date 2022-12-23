import { lazyEvmosImport } from "src/app/helpers/import.helper";
import { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import { AddressUsage } from "../../../safes/addressusage";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMLedgerSafe } from "../../evms/safes/evm.ledger.safe";

export class EvmosLedgerSafe extends EVMLedgerSafe {
  protected evmosAddress: string = null; // TODO: persistence to not prompt password every time

  constructor(protected masterWallet: LedgerMasterWallet, protected chainId: number) {
    super(masterWallet, chainId);
  }

  public async initialize(networkWallet: AnyNetworkWallet): Promise<void> {
    const { ethToEvmos } = await lazyEvmosImport();
    this.evmosAddress = ethToEvmos(this.evmAddress)
  }

  public getAddresses(startIndex: number, count: number, internalAddresses: boolean, usage: AddressUsage | string): string[] {
    if (usage === AddressUsage.EVMOS || usage === AddressUsage.RECEIVE_FUNDS || usage === AddressUsage.SEND_FUNDS)
      return [this.evmosAddress];
    else
      return [this.evmAddress];
  }
}