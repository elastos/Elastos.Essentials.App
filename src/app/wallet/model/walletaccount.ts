export enum WalletAccountType {
    STANDARD = "Standard",
    MULTI_SIGN = "Multi-Sign"
}

/**
 * @deprecated legacy from SPVSDK - replaced with network options in MasterWallet - DELETE THIS
 */
export class WalletAccount {
    SingleAddress: boolean;
    Type: WalletAccountType;
}

/**
 * @deprecated DELETEME - with the new JS storage we know what we can do depending on if we have a seed, private key only, etc
 */
export enum WalletCreateType {
    MNEMONIC = "mnemonic",
    PRIVATE_KEY_EVM = "privatekey_evm",
    // PRIVATE_KEY_ELA = "privatekey_ela",
    // PRIVATE_KEY_BTC = "privatekey_btc",
    KEYSTORE = "keystore"
}

export enum WalletSortType {
    BALANCE = "balance",
    NAME = "name",
}
