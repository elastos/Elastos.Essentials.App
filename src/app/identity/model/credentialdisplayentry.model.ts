export type CredentialDisplayEntry = {
  credential: DIDPlugin.VerifiableCredential; // Related real credential
  issuer: string; // DID String of the credential issuer
  isVisible: boolean; // This credential is currently visible in the local DID Document
  willingToDelete: boolean;
  canDelete: boolean;
};
