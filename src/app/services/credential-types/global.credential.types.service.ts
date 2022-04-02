import { HttpClient } from "@angular/common/http";
import { Injectable, NgZone } from "@angular/core";
import { ToastController } from "@ionic/angular";
import * as jsonld from "jsonld";
import { Url } from 'jsonld/jsonld-spec';
import { firstValueFrom } from "rxjs";
import { DIDDocument } from "src/app/identity/model/diddocument.model";
import { DIDURL } from "src/app/identity/model/didurl.model";
import { DIDDocumentsService } from "src/app/identity/services/diddocuments.service";
import { Logger } from "src/app/logger";
import { Events } from "src/app/services/events.service";
import { DIDService } from "../../identity/services/did.service";
import { LocalStorage } from "../../identity/services/localstorage";
import { Native } from "../../identity/services/native";

export type CredentialTypeWithContext = {
  context: string;
  shortType: string;
}

type ContextPayload = {
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
  // TODO: MAKE IT PERSISTENT WITH EXPIRATION DATE
  private contextsCache: {
    [contextUrl: string]: ContextPayload
  } = {};

  constructor(
    public zone: NgZone,
    public toastCtrl: ToastController,
    public events: Events,
    public localStorage: LocalStorage,
    public native: Native,
    private didService: DIDService,
    private didDocumentsService: DIDDocumentsService,
    private http: HttpClient
  ) { }

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

    console.log("credentialJson", credentialJson)

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

      console.log("expanded", expanded);

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

    console.log("credentialJson", credentialJson)

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

  private async fetchContext(contextUrl: string): Promise<ContextPayload> {
    if (contextUrl in this.contextsCache)
      return this.contextsCache[contextUrl];

    if (contextUrl.startsWith("http")) {
      let payload = await firstValueFrom(this.http.get(contextUrl, {
        headers: {
          'Accept': 'application/json'
        }
      }));

      this.contextsCache[contextUrl] = payload as ContextPayload;

      // TODO: catch network errors

      return this.contextsCache[contextUrl]
    }
    else if (contextUrl.startsWith("did:")) { // EID url
      // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
      return new Promise(async resolve => {
        // Compute publisher's DID string based on context url
        let { publisher, shortCredentialId } = this.extractEIDContext(contextUrl);
        if (!publisher) {
          resolve(null);
          return;
        }

        let docStatus = await this.didDocumentsService.fetchOrAwaitDIDDocumentWithStatus(publisher);
        if (docStatus.document) {
          let credentialId = `${publisher}#${shortCredentialId}`;
          let contextPayload = this.getContextPayloadFromDIDDocument(docStatus.document, credentialId);

          this.contextsCache[contextUrl] = contextPayload;

          resolve(this.contextsCache[contextUrl]);
        }
        else {
          resolve(null);
        }
      });
    }
    else {
      // Unsupported
      Logger.log("credentialtypes", "Unsupported credential context url", contextUrl);
      return null;
    }
  }

  // From: did://elastos/insTmxdDDuS9wHHfeYD1h5C2onEHh3D8Vq/BenCredential9733350
  // To: did:elastos:insTmxdDDuS9wHHfeYD1h5C2onEHh3D8Vq + BenCredential9733350
  private extractEIDContext(context: string): { publisher: string, shortCredentialId: string } {
    let regex = new RegExp(/^did:\/\/elastos\/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/);
    let parts = regex.exec(context);

    if (!parts || parts.length < 3) {
      Logger.warn("credentialtypes", 'Invalid url format, cannot find credential publisher and ID');
      return null;
    }

    return {
      publisher: `did:elastos:${parts[1]}`,
      shortCredentialId: parts[2]
    }
  }

  public getContextPayloadFromDIDDocument(document: DIDDocument, credentialId: string): ContextPayload {
    let credential = document.getCredentialById(new DIDURL(credentialId));
    if (!credential)
      return null;

    let subject = credential.getSubject();
    if (!("@context" in subject)) {
      Logger.warn("credentialtypes", `Credential ${credentialId} found but no @context in the subject. Invalid format.`);
      return null;
    }

    return credential.getSubject();
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
            console.log("Loader is resolving url using our DID loader", url);

            console.log("resolve custom url TODO", url);
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
}
