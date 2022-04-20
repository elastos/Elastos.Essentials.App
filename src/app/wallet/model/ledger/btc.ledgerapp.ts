import Btc, { AddressFormat } from "@ledgerhq/hw-app-btc";
import Transport from "@ledgerhq/hw-transport";
import { Logger } from "src/app/logger";
import { GlobalNetworksService, TESTNET_TEMPLATE } from "src/app/services/global.networks.service";
import { LeddgerAccountType } from "../ledger.types";
import { LedgerAccount, LedgerApp } from "./ledgerapp";

export enum BTCAddressType {
  SEGWIT = "segwit",
  LEGACY = "legacy",
  NATIVESEGWIT = "p2sh",
}

const btc_mainnet_paths = {
  "segwit": "84'/0'/x'/0/0",
  "legacy": "44'/0'/x'/0/0'",
  "p2sh" : "49'/0'/0'/0/0",
};

const btc_testnet_paths = {
  "segwit": "84'/1'/x'/0/0",
  "legacy": "44'/1'/x'/0/0'",
  "p2sh" : "49'/1'/0'/0/0",
};

const formats : {
  [k: string]: AddressFormat
} = {
  "segwit": "bech32",
  "legacy": "legacy",
  "p2sh" : "p2sh",
};

//tb1qqyww579uw3zj8wsfgrngxgyqjkjka0m7m2mkz6

export class BTCLedgerApp extends LedgerApp {
  private btcApp : Btc = null;

  constructor(protected transport: Transport) {
    super(transport);

    this.btcApp = new Btc(this.transport);
  }

  public async getAddressesByType(startIndex: number, count: number, type: BTCAddressType): Promise<LedgerAccount[]> {
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
        type: LeddgerAccountType.BTC,
        address:address.bitcoinAddress,
        pathIndex:i,
        path,
        addressType: type,
        publicKey: address.publicKey
      })
    }
    Logger.log('wallet', 'BTCLedgerApp getAddresses: ', addresses)
    return addresses;
  }

  public async getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<LedgerAccount[]> {
    return await this.getAddressesByType(startIndex, count, BTCAddressType.SEGWIT)
  }
}