export class NewIdentity {
    name: string;
    mnemonic: string;
    mnemonicLanguage?: DIDPlugin.MnemonicLanguage = null;
    mnemonicPassphrase?: string = null;
}