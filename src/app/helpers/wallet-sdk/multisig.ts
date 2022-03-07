import { CurveType } from "./crypto/curve";
import { HDKey, Version } from "./hdkey";

/**
 * Temporary class for elastos multisig operations.
 * This may be converted/merged to other classes later.
 */
export class Multisig {
  /**
   * Sort hex keys (xpub, xprv, etc) alphabetically
   */
  /* public static sortedPublicKeys(keys: Buffer[]): Buffer[] {
    let keysAsStrings = keys.map(k => {
      return {
        buf: k,
        str: k.toString("hex")};
    });
  } */

  /**
   * Returns the cosigner index for cosigner with key cosignerKey among all keys.
   * The index is the position of cosigner's key in the alphabetically sorted list of all keys.
   */
  public static getCosignerIndex(publicKeys: Buffer[], cosignerPublicKey: Buffer): number {
    return publicKeys.sort((a, b) => a.compare(b)).findIndex(k => k.equals(cosignerPublicKey));
  }

  /**
   * [xpub1, xpub2] => [pubkey1, pubkey2]
   */
  public static extendedToPublicKeys(extKeys: string[], curve: CurveType, versions: Version): Buffer[] {
    return extKeys.map(ek => HDKey.fromExtendedKey(ek, curve, versions).getPublicKeyBytes());
  }
}