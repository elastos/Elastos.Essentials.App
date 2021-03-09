import { CLIApp } from "./cliapp.model";

/**
 * Model representing app info as published as a credential on the DID sidechain.
 */
export class AppPublicationCredentialSubject extends CLIApp {
    resources: {
        appIconLocation: string,
        appBannerLocation: string,
        appBinaryLocation: string
    }
}