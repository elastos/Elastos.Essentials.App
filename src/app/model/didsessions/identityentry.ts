import { IdentityAvatar } from "./identityavatar";

export type IdentityEntry = {
  /** ID of the DID store that contains this DID entry */
  didStoreId: string;
  /** DID string (ex: did:elastos:abcdef) */
  didString: string;
  /** Identity entry display name, set by the user */
  name: string;
  /** Optional profile picture for this identity */
  avatar?: IdentityAvatar;
  /** DID data storage path, for save did data and the other module data, such as spv */
  didStoragePath: string;
  /** Date at which this identity entry was created. NOTE: some old sessions don't have this info */
  creationDate?: number;
}