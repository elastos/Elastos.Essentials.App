/**
 * Represents one asset minted by a NFT contract.
 */
export class NFTAsset {
  /** Token ID in the contract */
  public id: string = null;
  /** Name discovered in metadata, if any */
  public name? = null;
  /** Description discovered in metadata, if any */
  public description?: string = null;
  /** URL of the image representing the asset, discovered in metadata, if any */
  public imageURL?: string = null;
}