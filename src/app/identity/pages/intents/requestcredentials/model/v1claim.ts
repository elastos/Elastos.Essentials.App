import { DID as ConnDID } from "@elastosfoundation/elastos-connectivity-sdk-js";

/**
 * Older version (v1) of the Claim type provided by the connectivity SDK.
 * This type has changed but as we want to support older apps using this version, we maintian a copy
 * of the old type here for conversion.
 */
export type V1Claim = {
  /** Reason displayed to user on the identity wallet UI. */
  reason: string;
  /** Json path query to match user credentials against */
  query: string;
  /** Minimum number of credentials that should be returned. Default: 1 */
  min?: number;
  /** Maximum number of credentials that should be returned. Default: 1 */
  max?: number;
  /**
   * Credentials must have been issued by any of these specific DIDs. Default: undefined,
   * meaning that any issuer is accepted.
   */
  issuers?: string[];
  /**
   * In case the user has no credential matching the claim, the identity wallet can recommend
   * one or more urls (dApp, native store app...) where credentials can be obtained.
   * For instance, if the claim requires a "KYC-ed" credential issued by a specific issuer,
   * the recommendation url may be the issuer's dApp url */
  noMatchRecommendations?: ConnDID.NoMatchRecommendation[];
}