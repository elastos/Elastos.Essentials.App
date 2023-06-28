
export enum WalletAddressType {
    WalletAddressType_btc_legacy = 'btclegacy',
    WalletAddressType_ela = 'elastosmainchain',
    WalletAddressType_evm = 'evm',
    WalletAddressType_iotex = 'iotex',
    WalletAddressType_tron = 'tron',
}

export type WalletAddress = {
    addressType: WalletAddressType,
    address: string,
    publicKey: string,
    signature: string, // result of signature of concat(did, wallet address)
}