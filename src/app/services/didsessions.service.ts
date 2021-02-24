import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';

export type IdentityAvatar = {
  /** Picture content type: "image/jpeg" or "image/png" */
  contentType: string;
  /** Raw picture bytes encoded to a base64 string */
  base64ImageData: string;
}

export type IdentityEntry = {
  /** ID of the DID store that containes this DID entry */
  didStoreId: string;
  /** DID string (ex: did:elastos:abcdef) */
  didString: string;
  /** Identity entry display name, set by the user */
  name: string;
  /** Optional profile picture for this identity */
  avatar?: IdentityAvatar;
}

/**
* Option parameters that can be passed during the sign in operation.
*/
export type SignInOptions = {
  /** Suggested session langauge code to use? */
  sessionLanguage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DIDSessionsService {
  constructor(private platform: Platform) {
    this.platform.ready().then(() => {
    });
  }

  /**
   * Inserts a new identity entry and saves it permanently.
   *
   * In case an entry with the same DID store ID and DID string already exists, the existing
   * entry is updated.
   */
  public async addIdentityEntry(entry: IdentityEntry): Promise<void> {
    // TODO @chad
  }

  /**
   * Deletes a previously added identity entry.
   */
  public async deleteIdentityEntry(didString: string): Promise<void> {
    // TODO @chad
  }

  /**
   * Gets the list of all identity entries previously created.
   */
  public async getIdentityEntries(): Promise<IdentityEntry[]> {
    // TODO @chad
    return [];
  }

  /**
   * Gets the signed in identity.
   *
   * @returns The signed in identity if any, null otherwise.
   */
  public async getSignedInIdentity(): Promise<IdentityEntry | null> {
    return {
      didStoreId: "12345",
      didString: "did:elastos:abcde",
      name: "Tmp user"
    };
  }

  /**
   * Signs a given identity entry in.
   *
   * This identity becomes the new global identity for the "DID Session".
   * All dApps get sandboxed in this DID context and don't see any information about the other available
   * identities.
   */
  public async signIn(entry: IdentityEntry, options?: SignInOptions): Promise<void> {
    // TODO @chad
  }

  /**
   * Signs the active identity out. All opened dApps are closed as there is no more active DID session.
   */
  public async signOut(): Promise<void> {
    // TODO @chad
  }
}
