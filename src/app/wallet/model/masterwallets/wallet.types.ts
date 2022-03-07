/* export enum DerivationPath {
  BTC = "m/0'/0",
  ELASTOS_MAINCHAIN = "m/44'/0'/0'/0",
  EVM = "m/44'/60'/0'/0"
} */

import { LeddgerAccountType } from "../ledger.types";

export enum WalletType {
  /** Single signature, wallet keys managed by Essentials */
  STANDARD = "standard",
  /** Single signature, wallet keys managed by a Ledger hardware device */
  LEDGER = "ledger",
  /** Multi signature, following the elastos/bitcoin "public key based" multi-wallet mechanism */
  MULTI_SIG_STANDARD = "multi_sign_standard",
  /** Multi signature, following the gnosis EVM contract mechanism (account addresses) */
  MULTI_SIG_EVM_GNOSIS = "multi_sign_evm_gnosis"
}

export type WalletNetworkOptions = {
  network: string; // Network key. eg: elastos, bsc...
}

export type ElastosMainChainWalletNetworkOptions = WalletNetworkOptions & {
  network: "elastos",

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
 * by "extended info" (wallet name, theme, shown coins...).
 *
 * Seed, mnemonic and private keys are AES encrypted by the pay password. This is not securing anything much,
 * but this is to avoid showing sensitive information directly in case the master wallet info would appear in
 * logs or sentry reports by mistake.
 */
export type SerializedMasterWallet = {
  type: WalletType;
  /** JS ".2" wallet ID format */
  id: string;
  /** User defined wallet name */
  name: string;
  /** Wallet theme (colors) */
  theme: Theme;
  /** List of network specific options. Eg: for elastos, "single/multi address wallet" */
  networkOptions: WalletNetworkOptions[];
  /** Origin of this wallet creation */
  creator: WalletCreator;
}

// TODO: move to another file
export type SerializedStandardMasterWallet = SerializedMasterWallet & {
  type: WalletType.STANDARD;

  /** Encrypted root seed key.*/
  seed?: string;
  /** Encrypted 12 mnemonic words */
  mnemonic?: string;
  /** For security reasons (to not store a user's usual password) we don't store the passphrase, but we remember if a passphrase was used to remind the user in the future */
  hasPassphrase?: boolean;
  /** Encrypted derived private key, for wallets imported by private key. If privateKey is set, seed and mnemonic may not exist */
  privateKey?: string;
  /**  */
  privateKeyType?: PrivateKeyType;
}

export type LedgerAccountOptions = {
    type: LeddgerAccountType;
    accountID: string;
    accountPathIndex: number
}

// TODO: move to another file
export type SerializedLedgerMasterWallet = SerializedMasterWallet & {
  type: WalletType.LEDGER;

  /** Identifier of the ledger device bound to this master wallet */
  deviceID: string;
//   /** Identifier of the ledger accounts bound to this master wallet */
//   accountID: string;

  accountOptions: LedgerAccountOptions[]
}

export type SerializedStandardMultiSigMasterWallet = SerializedMasterWallet & {
  type: WalletType.MULTI_SIG_STANDARD;

  /** Other existing wallet (standard, ledger) used as signer for the current user */
  signingWalletId: string;
  /** Number of signatures required for transactions */
  requiredSigners: number;
  /** Extended public keys of all the co-signers, including current user's entry */
  signersExtPubKeys: string[];

  // TODO: network options?
}
