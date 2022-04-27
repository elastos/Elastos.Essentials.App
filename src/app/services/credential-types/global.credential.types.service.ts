import { HttpClient } from "@angular/common/http";
import { Injectable, NgZone } from "@angular/core";
import { ToastController } from "@ionic/angular";
import * as jsonld from "jsonld";
import { Url } from 'jsonld/jsonld-spec';
import moment from "moment";
import Queue from "queue";
import { firstValueFrom } from "rxjs";
import { DIDDocument } from "src/app/identity/model/diddocument.model";
import { DIDURL } from "src/app/identity/model/didurl.model";
import { DIDDocumentsService } from "src/app/identity/services/diddocuments.service";
import { Logger } from "src/app/logger";
import { JSONObject } from "src/app/model/json";
import { Events } from "src/app/services/events.service";
import { TimeBasedPersistentCache } from "src/app/wallet/model/timebasedpersistentcache";
import { DIDService } from "../../identity/services/did.service";
import { LocalStorage } from "../../identity/services/localstorage";
import { Native } from "../../identity/services/native";

export type CredentialTypeWithContext = {
  context: string;
  shortType: string;
}

type ContextPayload = JSONObject & {
  "@context": unknown;
}

/**
 * Service responsible for helping in using full url credential types. Historically, we used short types
 * in credentials, such as "VerifiableCredential". Though in order to standardize credentials and provide
 * reusability using elastos DID and VCs, VCs have been upgraded to use types with context, such as:
 * "https://ns.elastos.org/credentials/v1#SensitiveCredential" instead of "SensitiveCredential".
 *
 * Unfortunately, VCs, store "types" and "@contexts" in different fields, and we need to use a JSON-LD
 * support library to reconstruct full urls from type+context.
 *
 * As JSON-LD resolves contexts from various locations (HTTPS, but also Elastos EID chain), we also provide
 * here a cache to avoid fetching those documents too often.
 *
 * Besides those, this service provides helper functions, for example to check if a credential is
 * correctly implemented, meaning that its content can relate to proper credential types.
 */
@Injectable({
  providedIn: "root",
})
export class GlobalCredentialTypesService {
  // Cache for fetched context JSON (from http urls or from the eid chain)
  // This cache is NOT persistent, it is populated again at every app start (for instance,
  // to make sure we get the latest types from DID document, if the service endpoint is updated).
  private contextsCache: TimeBasedPersistentCache<ContextPayload>;

  // Queue to make sure we fetch only one context at a time to avoid fetching the same url multiple times.
  private fetchContextQueue = new Queue({ autostart: true, concurrency: 1 });

  constructor(
    public zone: NgZone,
    public toastCtrl: ToastController,
    public events: Events,
    public localStorage: LocalStorage,
    public native: Native,
    private didService: DIDService,
    private didDocumentsService: DIDDocumentsService,
    private http: HttpClient
  ) {
  }

  // Called at boot, not related to the active user
  public async init(): Promise<void> {
    this.contextsCache = await TimeBasedPersistentCache.loadOrCreate("credentialcontextpayloads", true);
  }

  /**
   * From a given credential that contains types and contexts, returns the list of
   * expanded JSONLD identifiers for the credential "types".
   *
   * IMPORTANT NOTE: identifiers can, or can not be the same as the expected context + type concatenation.
   * For example, with w3c types, we have:
   * - Json context used in credentials: https://www.w3.org/2018/credentials/v1
   * - "Type" used in credentials: VerifiableCredential
   * - BUT... The expanded jsonld @id is : https://www.w3.org/2018/credentials#VerifiableCredential
   *   ... instead of what we could expect, https://www.w3.org/2018/credentials/v1#VerifiableCredential
   *
   * This is because jsonld resolved @id and @type fields inside the contexts.
   *
   * So we focus on identifiers here.
   */
  public async resolveExpandedCredentialTypeIdentifiers(credential: DIDPlugin.VerifiableCredential): Promise<string[]> {
    let credentialJson: any = null;
    try {
      credentialJson = JSON.parse(await credential.toJson());
    }
    catch (e) {
      // Credential's toJson() could throw an exception (not bound to a did store because of legacy DID plugin reasons)
      Logger.warn("credentialtypes", "Credential could not be parsed, returning empty types");
      return [];
    }

    // Make sure we have "https://www.w3.org/2018/credentials/v1" has first entry in the context,
    // this is a W3C spec requirement
    if (!("@context" in credentialJson) || credentialJson["@context"].indexOf("https://www.w3.org/2018/credentials/v1") !== 0) {
      return [];
    }

    /**
     * Expand the credential, meaning that the "@context" entry is removed and merged with "types" to
     * create full types.
     *
     * Output sample:
     *  Array of:
     *    '@context'?: Keyword['@context'] | undefined;
     *    '@id'?: Keyword['@id'] | undefined;
     *    '@type'?: OrArray<Keyword['@type']> | undefined;
     *    ... Other fields named with the resolved full context+field. Eg: https://www.w3.org/2018/credentials#issuanceDate
     */
    const expanded = await jsonld.expand(credentialJson, {
      documentLoader: this.buildElastosJsonLdDocLoader()
    });

    if (expanded && expanded.length > 0) {
      // Use only the first output entry. There is normally only one.
      let resultJsonLDNode = expanded[0];

      // Expanded types identifiers can be a string or an array of string. We make this become an array, always.
      return Array.isArray(resultJsonLDNode["@type"]) ? resultJsonLDNode["@type"] : [resultJsonLDNode["@type"]];
    }
    else {
      console.log("error");
    }

    return [];
  }

  /**
   * For a given credential, resolves remote contexts JSONLD definitions, then tries
   * to find short types in those contexts.
   *
   * The JSONLD library does something similar but can only expand context+types to
   * return their actual @ids, but it doesn't help us know thich type was found in which context definition.
   */
  public async resolveTypesWithContexts(credential: DIDPlugin.VerifiableCredential): Promise<CredentialTypeWithContext[]> {
    let credentialJson: any = null;
    try {
      credentialJson = JSON.parse(await credential.toJson());
    }
    catch (e) {
      // Credential's toJson() could throw an exception (not bound to a did store because of legacy DID plugin reasons)
      Logger.warn("credentialtypes", "Credential could not be parsed, returning empty types");
      return [];
    }

    //console.log("credentialJson", credentialJson)

    // Make sure we have "https://www.w3.org/2018/credentials/v1" has first entry in the context,
    // this is a W3C spec requirement
    if (!("@context" in credentialJson) || credentialJson["@context"].indexOf("https://www.w3.org/2018/credentials/v1") !== 0) {
      return [];
    }

    // Resolve all contexts
    let contexts = credentialJson["@context"];
    let contextPayloadsWithUrls: { url: string, payload: ContextPayload }[] = [];
    for (let context of contexts) {
      let contextPayload = await this.fetchContext(context);
      if (!contextPayload) {
        Logger.warn("credentialtypes", "Failed to fetch credential type context for", context);
        continue;
      }

      //console.log("context payload", context, contextPayload)

      if ("@context" in contextPayload) {
        contextPayloadsWithUrls.push({
          url: context,
          payload: contextPayload
        });
      }
    }

    // Now that we have all context payloads, search short types in each of them
    let pairs: CredentialTypeWithContext[] = [];
    for (let type of credential.getTypes()) { // Short types
      let contextInfo = contextPayloadsWithUrls.find(c => Object.keys(c.payload["@context"]).indexOf(type) >= 0);
      if (contextInfo) {
        pairs.push({
          context: contextInfo.url,
          shortType: type
        })
      }
    }

    return pairs;
  }

  // eslint-disable-next-line require-await
  private async fetchContext(contextUrl: string): Promise<ContextPayload> {
    let cacheEntry = this.contextsCache.get(contextUrl);
    if (cacheEntry) {
      return cacheEntry.data;
    }

    return new Promise((resolve, reject) => {
      this.fetchContextQueue.push(() => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise(async (resolveQueue, rejectQueue) => {
          if (contextUrl.startsWith("http")) {
            let payload = await firstValueFrom(this.http.get(contextUrl, {
              headers: {
                'Accept': 'application/json'
              }
            }));

            this.contextsCache.set(contextUrl, payload as ContextPayload, moment().unix());
            // NOTE - don't ssve the cache = not persistent on disk - await this.contextsCache.save();

            // TODO: catch network errors

            resolve(payload as ContextPayload); resolveQueue(null);
          }
          else if (contextUrl.startsWith("did:")) { // EID url
            // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
            try {
              // Compute publisher's DID string based on context url
              let { publisher, shortType } = this.extractEIDContext(contextUrl);
              if (!publisher) {
                Logger.warn("credentialtypes", "Failed to extract publisher from context", contextUrl);
                resolve(null); resolveQueue(null);
                return;
              }

              let docStatus = await this.didDocumentsService.fetchOrAwaitDIDDocumentWithStatus(publisher);
              if (docStatus.document) {
                let serviceId = `${publisher}#${shortType}`;
                let contextPayload = this.getContextPayloadFromDIDDocument(docStatus.document, serviceId);

                this.contextsCache.set(contextUrl, contextPayload, moment().unix());
                // NOTE - don't save the cache = not persistent on disk - await this.contextsCache.save();

                resolve(contextPayload); resolveQueue(null);
              }
              else {
                resolve(null); resolveQueue(null);
              }
            }
            catch (e) {
              reject(e); resolveQueue(null);
            }
          }
          else {
            // Unsupported
            Logger.log("credentialtypes", "Unsupported credential context url", contextUrl);
            resolve(null); resolveQueue(null);
          }
        });
      });
    });
  }

  // From: did://elastos/insTmxdDDuS9wHHfeYD1h5C2onEHh3D8Vq/BenCredential
  // To: did:elastos:insTmxdDDuS9wHHfeYD1h5C2onEHh3D8Vq + BenCredential
  private extractEIDContext(context: string): { publisher: string, shortType: string } {
    let regex = new RegExp(/^did:\/\/elastos\/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/);
    let parts = regex.exec(context);

    if (!parts || parts.length < 3) {
      Logger.warn("credentialtypes", 'Invalid url format, cannot find credential publisher and ID');
      return null;
    }

    return {
      publisher: `did:elastos:${parts[1]}`,
      shortType: parts[2]
    }
  }

  /**
   * Searches the given service in the DID document. If found, uses the service endpoint to
   * get the right target credential id in the same document, and gets the context payload out of it.
   */
  public getContextPayloadFromDIDDocument(document: DIDDocument, serviceId: string): ContextPayload {
    let service = document.getService(serviceId);
    if (!service) {
      Logger.warn("credentialtypes", "The DID document has no service with ID: " + serviceId);
      return null;
    }

    let targetCredentialId = service.getEndpoint();

    let credential = document.getCredentialById(new DIDURL(targetCredentialId));
    if (!credential) {
      Logger.warn("credentialtypes", "The DID document has no credential context credential that matches (service id, credential id): ", serviceId, targetCredentialId);
      return null;
    }

    /**
     * Format: https://ns.elastos.org/credentials/context/v1
     * credentialSubject: {
     *   definition: {
     *      @context: {}
     *   }
     * }
     */
    let subject = credential.getSubject();
    if (!("definition" in subject) || !("@context" in subject["definition"])) {
      Logger.warn("credentialtypes", `Credential ${targetCredentialId} found but no definition/@context in the subject. Invalid format.`, subject);
      return null;
    }

    return subject["definition"];
  }

  /**
   * Custom loader for the JSON-LD library, that supports resolving contexts from the EID chain.
   */
  private buildElastosJsonLdDocLoader(): { (url: Url, callback: any): Promise<any> } {
    return (url: Url, callback: any) => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
      return new Promise(async (resolve, reject) => {
        try {
          if (url.startsWith("did")) {
            // NOTE: normally fetchcontext could be used to resolve "http" urls as well but for now
            // we use the json ld's "defaultLoader" as it also deals wit hmore advanced cases like
            // following header redirection for special types, etc (more things than our fetcher).
            // For instance, our fetcher works with ns.elastos.org urls, but not with schema.org ones.
            let context = await this.fetchContext(url);
            resolve({
              contextUrl: null,
              documentUrl: url,
              document: context
            });
          }
          else {
            let defaultLoader = (jsonld as any).documentLoaders.xhr();
            let data = await defaultLoader(url);
            resolve(data);
          }
        }
        catch (e) {
          reject(e);
        }
      });
    }
  }

  /**
   * Queues a credential verification and tells if the credential fully conforms to its types, meaning
   * that all fields in the credential subject have a definition in one of the credential types used
   * by the credential.
   */
  public async verifyCredential(credential: DIDPlugin.VerifiableCredential): Promise<boolean> {
    try {
      let credentialContent = JSON.parse(await credential.toJson());

      let credentialContentJson = credentialContent;
      if (typeof credentialContentJson !== "object") {
        return false;
      }

      // Make sure we have "https://www.w3.org/2018/credentials/v1" has first entry in the context,
      // this is a W3C spec requirement
      if (!("@context" in credentialContentJson) || credentialContentJson["@context"].indexOf("https://www.w3.org/2018/credentials/v1") !== 0) {
        return false;
      }

      // Make sure there is a credentialSubject
      if (!("credentialSubject" in credentialContentJson)) {
        return false;
      }

      // Make sure there is a proof
      if (!("proof" in credentialContentJson)) {
        return false;
      }

      let compacted = await jsonld.compact(credentialContentJson, credentialContentJson["@context"], {
        documentLoader: this.buildElastosJsonLdDocLoader()
      });

      if (compacted) {
        // If the credential subject is empty (only id), JsonLD returns credentialSubject: "theid".
        // We turn this back to an object for our display to work better right after.
        if (!("credentialSubject" in compacted) || typeof compacted["credentialSubject"] === "string") {
          compacted.credentialSubject = {
            id: compacted.credentialSubject
          }
        }

        // Check what original fields are missing after compacting. Is some warnings are generated,
        // this means the document is not conform
        let { modifiedDoc, warningsGenerated } = this.addMissingFieldsToCompactHtmlResult(credentialContentJson, compacted);

        if (!warningsGenerated)
          return true;
      }
    }
    catch (e) {
      return false;
    }

    return false;
  }

  // TODO: RECURSIVE
  private addMissingFieldsToCompactHtmlResult(originalUserDoc: any, compactedDoc: any): { modifiedDoc: any, warningsGenerated: boolean } {
    let warningsGenerated = false;
    let modifiedCompactedDoc = Object.assign({}, compactedDoc);

    // Credential subject
    for (let key of Object.keys(originalUserDoc.credentialSubject)) {
      if (!(key in compactedDoc.credentialSubject)) {
        modifiedCompactedDoc.credentialSubject["MISSING_KEY_" + key] = "This field is missing in credential types";
        warningsGenerated = true;
      }
    }

    // Proof
    for (let key of Object.keys(originalUserDoc.proof)) {
      if (!(key in compactedDoc.proof)) {
        modifiedCompactedDoc.proof["MISSING_KEY_" + key] = "This field is missing in credential types";
        warningsGenerated = true;
      }
    }

    return {
      modifiedDoc: modifiedCompactedDoc,
      warningsGenerated
    };
  }
}
