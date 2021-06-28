import { DIDStore } from "./didstore.model";
import { DID } from "./did.model";

// Event name: diddocument:publishresult
export type DIDDocumentPublishEvent = {
    didStore: DIDStore,
    published?: boolean,
    cancelled?: boolean,
    error?: boolean
}
