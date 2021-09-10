export enum WalletAccountType {
    STANDARD = "Standard",
    MULTI_SIGN = "Multi-Sign"
}

export class WalletAccount {
    SingleAddress: boolean;
    Type: WalletAccountType;
}
