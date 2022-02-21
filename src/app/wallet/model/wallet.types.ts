/* export enum DerivationPath {
  BTC = "m/0'/0",
  ELASTOS_MAINCHAIN = "m/44'/0'/0'/0",
  EVM = "m/44'/60'/0'/0"
} */

export type WalletNetworkOptions = {
  network: string; // Network key. eg: elastos, bsc...
}

export type ElastosWalletNetworkOptions = WalletNetworkOptions & {
  singleAddress: boolean;
}

export type Theme = {
  background: string,
  color: string
};

export enum WalletCreator {
  WALLET_APP = "wallet_app", // Wallet created by Essentials (eg: based on the same mnemonic as the DID)
  USER = "user" // Wallet created by the user (new wallet, import wallet)
}

/**
 * Original of imported private keys. Used to know where and how wallets imported by private keys can be used.
 * eg: ethereum private key can be used on all EVM networks. But Bitcoin segwit key can be used only as bitcoin segwit.
 */
export enum PrivateKeyType {
  EVM = "evm",
  BTC_SEGWIT = "btc_segwit",
  BTC_LEGACY = "btc_legacy"
}

/**
 * New model (as of 2022.02) used to store master wallets info in user's settings instead of relying on
 * the SPVSDK. This contains info that was both previously handled by the SPVSDK (ID, mnemonic...) and
 * by "extended info" (wallet name, theme, shown coins...)
 */
export interface MasterWalletInfo {
  /** JS ".2" wallet ID format */
  id: string;
  /** User defined wallet name */
  name: string;
  /** Wallet theme (colors) */
  theme: Theme;
  /** Root seed key */
  seed?: string;
  /** 12 mnemonic words */
  mnemonic?: string;
  /** For security reasons (to not store a user's usual password) we don't store the passphrase, but we remember if a passphrase was used to remind the user in the future */
  hasPassphrase?: boolean;
  /** Derived private key, for wallets imported by private key. If privateKey is set, seed and mnemonic may not exist */
  privateKey?: string;
  /**  */
  privateKeyType?: PrivateKeyType;
  //privateKeyType?; // TBD - enum?
  /** List of network specific options. Eg: for elastos, "single/multi address wallet" */
  networkOptions: WalletNetworkOptions[];
  /** Origin of this wallet creation */
  creator: WalletCreator;
}

/**
* @deprecated
*/
export class ExtendedMasterWalletInfo {
  /* Created by system when create a new identity */
  createdBySystem: boolean; // TODO: REPLACED BY WalletCreator
  /* Created by mnemonic or private key */
  createType: WalletCreateType;
}