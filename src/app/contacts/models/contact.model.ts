import { Avatar } from "./avatar";
import { DIDDocument } from "./did.model";
import { CredentialProfile } from "./profile";

export class Contact {
  constructor(
    // DID Values
    public id: DIDPlugin.DIDString,
    public didDocument: DIDDocument,
    public credentials: CredentialProfile,

    // Custom Values
    public avatarLocal: Avatar,
    public customName: string,
    public customNote: string,

    // Boolean Values
    public isPicked: boolean = false,
    public isFav: boolean,

    // Other Values
    public carrierAddress: string,
    public notificationsCarrierAddress: string
  ) {}
}

