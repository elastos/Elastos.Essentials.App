import { DID as ConnSDKDID } from "@elastosfoundation/elastos-connectivity-sdk-js";

/**
 * Base identity intent
 */
export type IdentityIntentParams = {
    appPackageId?: string;
}
export type IdentityIntent<T> = {
    action: string;
    intentId: number;
    originalJwtRequest?: string;
    from: EssentialsIntentPlugin.IntentSource;
    params: T;
}
export type IdentityIntentCustomization = {
    primarycolorlightmode: string;
    primarycolordarkmode: string;
}

/**
 * App ID credential issue
 */
export type AppIdCredIssueIdentityIntentParams = IdentityIntentParams & {
    appinstancedid: string;
    appdid: string;
}
export type AppIdCredIssueIdentityIntent = IdentityIntent<AppIdCredIssueIdentityIntentParams> & {
}

/**
 * Credential access
 * @deprecated
 */
export type CredAccessIdentityIntentParams = IdentityIntentParams & {
    claims: any,
    publisheddid: boolean,
    customization: IdentityIntentCustomization,
    nonce: string,
    realm: string,
}
/**
 * @deprecated
 */
export type CredAccessIdentityIntent = IdentityIntent<CredAccessIdentityIntentParams> & {
    jwtExpirationDays?: number;
}

export type RequestCredentialsIntentParams = IdentityIntentParams & {
    request: ConnSDKDID.CredentialDisclosureRequest;
}
/**
 * Request credentials (v2 version of Credential access)
 */
export type RequestCredentialsIntent = IdentityIntent<RequestCredentialsIntentParams> & {
}

/**
 * Set hive provider
 */
export type SetHiveProviderIdentityIntentParams = IdentityIntentParams & {
    name: string;
    address: string;
}
export type SetHiveProviderIdentityIntent = IdentityIntent<SetHiveProviderIdentityIntentParams> & {
}

/**
 * Register application profile
 */
export type RegAppProfileIdentityIntentParams = IdentityIntentParams & {
    identifier: string;
    connectactiontitle: string;
    customcredentialtypes: string[];
    sharedclaims: [];
}
export type RegAppProfileIdentityIntent = IdentityIntent<RegAppProfileIdentityIntentParams> & {
}

/**
 * Cred import
 */
export type CredImportIdentityIntentParams = IdentityIntentParams & {
    credentials: any[], // Array of DID Verifiable Credentials as JSON objects
    forceToPublishCredentials: boolean;
    customization: IdentityIntentCustomization;
}
export type CredImportIdentityIntent = IdentityIntent<CredImportIdentityIntentParams> & {
}

/**
 * Cred issue
 */
export type CredIssueIdentityIntentParams = IdentityIntentParams & {
    identifier: string,
    types: string[],
    subjectdid: string,
    properties: any,
    expirationDate?: string,
}
export type CredIssueIdentityIntent = IdentityIntent<CredIssueIdentityIntentParams> & {
}

/**
 * Cred delete
 */
export type CredDeleteIdentityIntentParams = IdentityIntentParams & {
    credentialsids: string[], // Array of Verifiable Credentials IDs to be deleted (short or long form)
}
export type CredDeleteIdentityIntent = IdentityIntent<CredDeleteIdentityIntentParams> & {
}

/**
 * Sign
 */
export type SignIdentityIntentParams = IdentityIntentParams & {
    data: string,                 // Raw data to sign
    signatureFieldName?: string,  // Name of the variable that holds the signed data, in the response.
    jwtExtra?: any                 // Custom app fields that will be passed directly to the JWT payload.
}
export type SignIdentityIntent = IdentityIntent<SignIdentityIntentParams> & {
}