import { Profile } from './profile.model';

/**
 * Class that holds various data about an on going DID being created.
 * This objects lives from "new did" process start until the DID has really been created.
 */
export class NewDID {
    public password: string = null;
    public profile: Profile = null;
    public mnemonic: string = null;
}