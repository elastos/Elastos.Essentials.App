import { Injectable } from '@angular/core';
import { Logger } from '../logger';

declare let didManager: DIDPlugin.DIDManager;

export type ApplicationDIDInfo = {
  didDocument: DIDPlugin.DIDDocument;
  iconUrl: string; // Hive icon url
  name: string; // App name
}

/**
 * Fetches application DID documents from chain and extracts information.
 * Useful to get the title or icon of a published application DID.
 *
 * Application DIDs are specific DIDs used to represent applications. They contain specific credentials
 * that describe their icon, title, callback urls, etc.
 */
@Injectable({
  providedIn: 'root'
})
export class GlobalApplicationDidService {
  constructor() { }

  /**
   * Fetches and extracts all info about a published app DID, given its DID string.
   */
  public async fetchPublishedAppInfo(appDid: string): Promise<ApplicationDIDInfo> {
    try {
      let appDidDocument = await this.fetchDidDocument(appDid);
      if (!appDidDocument) {
        return {
          didDocument: appDidDocument,
          iconUrl: null,
          name: null
        };
      }

      let appCredential = this.getCredentialByType(appDidDocument, "ApplicationCredential");
      if (!appCredential) {
        return {
          didDocument: appDidDocument,
          iconUrl: null,
          name: null
        };
      }

      let subject = appCredential.getSubject();
      return {
        didDocument: appDidDocument,
        iconUrl: subject["iconUrl"],
        name: subject["name"]
      }
    }
    catch (e) {
      Logger.error('applicationdid', ' Exception while fetching published app info', e);
      return {
        didDocument: null,
        iconUrl: null,
        name: null
      };
    }
  }

  private fetchDidDocument(appDID: string): Promise<DIDPlugin.DIDDocument> {
    return new Promise((resolve, reject) => {
      Logger.log("applicationdid", "Get app identity on chain - Resolving appDid", appDID);
      didManager.resolveDidDocument(appDID, true, (document) => {
        Logger.log("applicationdid", `Got application DID document for ${appDID}`, document);
        resolve(document);
      }, (err) => {
        Logger.warn("applicationdid", `Could not find application DID document for ${appDID}`, err);
        reject(err);
      });
    });
  }

  private getCredentialByType(appDidDocument: DIDPlugin.DIDDocument, credentialType: string): DIDPlugin.VerifiableCredential {
    let credentials = appDidDocument.findCredentials(["ApplicationCredential"]);
    if (!credentials || credentials.length === 0) // No such credential in the DID document
      return null;

    // Always use the first credential by default (should have only 1 normally)
    return credentials[0];
  }
}
