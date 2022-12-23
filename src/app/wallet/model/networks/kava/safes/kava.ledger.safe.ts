import { lazyKavaImport } from "src/app/helpers/import.helper";
import { LedgerMasterWallet } from "../../../masterwallets/ledger.masterwallet";
import { AddressUsage } from "../../../safes/addressusage";
import { AnyNetworkWallet } from "../../base/networkwallets/networkwallet";
import { EVMLedgerSafe } from "../../evms/safes/evm.ledger.safe";

export class KavaLedgerSafe extends EVMLedgerSafe {
  protected kavaAddress: string = null; // TODO: persistence to not prompt password every time

  constructor(protected masterWallet: LedgerMasterWallet, protected chainId: number) {
    super(masterWallet, chainId);
  }

  public async initialize(networkWallet: AnyNetworkWallet): Promise<void> {
    const { utils } = await lazyKavaImport();
    this.kavaAddress = utils.ethToKavaAddress(this.evmAddress)
  }

  public getAddresses(startIndex: number, count: number, internalAddresses: boolean, usage: AddressUsage | string): string[] {
    if (usage === AddressUsage.KAVA || usage === AddressUsage.RECEIVE_FUNDS || usage === AddressUsage.SEND_FUNDS)
      return [this.kavaAddress];
    else
      return [this.evmAddress];
  }
}