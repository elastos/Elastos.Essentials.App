import { DIDURL } from './didurl.model';
import { LocalStorage } from '../services/localstorage';
import { WrongPasswordException } from './exceptions/wrongpasswordexception.exception';
import { DIDSyncService } from '../services/didsync.service';
import { DID } from './did.model';
import { DIDHelper } from '../helpers/did.helper';
import { DIDEvents } from '../services/events';

export class VerifiableCredential {
    constructor(public pluginVerifiableCredential: DIDPlugin.VerifiableCredential) {
    }
}