export enum WalletAccountType {
    STANDARD = "Standard",
    MULTI_SIGN = "Multi-Sign"
}

export class WalletAccount {
    SingleAddress: boolean;
    Type: WalletAccountType;
}

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
