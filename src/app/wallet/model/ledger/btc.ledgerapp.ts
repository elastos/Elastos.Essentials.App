import Btc, { AddressFormat } from "@ledgerhq/hw-app-btc";
import Transport from "@ledgerhq/hw-transport";
import { Logger } from "src/app/logger";
import { GlobalNetworksService, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { BTCAddressType } from "../btc.types";
import { LedgerAccountType } from "../ledger.types";
import { AnyLedgerAccount, LedgerApp } from "./ledgerapp";

const btc_mainnet_paths = {
  "legacy": "44'/0'/x'/0/0",
  "p2sh": "49'/0'/x'/0/0",
  "nativesegwit": "84'/0'/x'/0/0",
  "taproot": "86'/0'/x'/0/0",
};

const btc_testnet_paths = {
  "legacy": "44'/1'/x'/0/0",
  "p2sh": "49'/1'/x'/0/0",
  "nativesegwit": "84'/1'/x'/0/0",
  "taproot": "86'/1'/x'/0/0",
};

const formats: {
  [k: string]: AddressFormat
} = {
  "segwit": "bech32",
  "legacy": "legacy",
  "p2sh": "p2sh",
};

//tb1qqyww579uw3zj8wsfgrngxgyqjkjka0m7m2mkz6

export class BTCLedgerApp extends LedgerApp<BTCAddressType> {
  private btcApp: Btc = null;

  constructor(protected transport: Transport) {
    super(transport);

    this.btcApp = new Btc(this.transport);
  }

  public async getAddressesByType(startIndex: number, count: number, type: BTCAddressType): Promise<AnyLedgerAccount[]> {
    let addresses = [];

    let network = GlobalNetworksService.instance.getActiveNetworkTemplate();
    let path = btc_mainnet_paths[type] || btc_mainnet_paths[0];
    if (network === TESTNET_TEMPLATE) {
      path = btc_testnet_paths[type] || btc_testnet_paths[0];
    }

    let addressFormat: AddressFormat = formats[type];
    if (!addressFormat) addressFormat = formats[0];

    for (let i = startIndex; i < startIndex + count; i++) {
      const realPath = path.replace("x", String(i));
      let address = await this.btcApp.getWalletPublicKey(realPath, { format: addressFormat });
      addresses.push({
        type: LedgerAccountType.BTC,
        address: address.bitcoinAddress,
        pathIndex: i,
        path: realPath,
        addressType: type,
        publicKey: address.publicKey
      })
    }
    Logger.log('wallet', 'BTCLedgerApp getAddresses: ', addresses)
    return addresses;
  }

  public async getAddresses(addressType: BTCAddressType, startIndex: number, count: number, internalAddresses: boolean): Promise<AnyLedgerAccount[]> {
    return await this.getAddressesByType(startIndex, count, addressType)
  }

  public getDisplayableAddressType(addressType: BTCAddressType): string {
    switch (addressType) {
      case BTCAddressType.NativeSegwit: return "Native Segwit";
      case BTCAddressType.Legacy: return "Legacy";
      default: return null;
    }
  }
}