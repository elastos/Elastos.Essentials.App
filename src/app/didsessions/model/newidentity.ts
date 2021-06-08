import { DID } from "./did.model";
import { DIDStore } from "./didstore.model";

export class NewIdentity {
    didStore: DIDStore = null;
    storePass: string = null;
    did: DID = null;
    name: string;
    mnemonic: string;
    mnemonicLanguage?: DIDPlugin.MnemonicLanguage = null;
    mnemonicPassphrase?: string = null;
}