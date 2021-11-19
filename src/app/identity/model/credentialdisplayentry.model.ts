import { VerifiableCredential } from "./verifiablecredential.model";

export type CredentialDisplayEntry = {
  credential: VerifiableCredential; // Related real credential
  issuer: string; // DID String of the credential issuer
  isInLocalDocument: boolean; // This credential is currently visible in the local DID document
  isInPublishedDocument: boolean; // This credential is currently published in the on-chain DID document
  willingToDelete: boolean;
  canDelete: boolean;
};
