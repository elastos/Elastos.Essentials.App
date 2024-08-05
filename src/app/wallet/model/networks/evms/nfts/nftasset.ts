import { BPoSNFTInfo } from "../../../elastos.types";

export type NFTAssetAttribute = {
  trait_type: string; // eg: "Level", "Eyes"
  value: number | string; // eg: 5, "blue"
  display_type?: "number" | "date" | "boost_number" | "boost_percentage";
}

/**
 * Represents one asset minted by a NFT contract.
 */
export class NFTAsset {
  /** Token ID in the contract */
  public id: string = null;
  /** If set, use this instead of "id" for display purpose */
  public displayableId?: string = null;
  /** Name discovered in metadata, if any */
  public name?= null;
  /** Description discovered in metadata, if any */
  public description?: string = null;
  /** URL of the image representing the asset, discovered in metadata, if any */
  public imageURL?: string = null;
  /** Opensea/Rarible attributes standard */
  public attributes?: NFTAssetAttribute[];
  /** Opensea/Rarible project url standard */
  public externalURL?: string;
  /** ESC BPoS NFT */
  public bPoSNFTInfo?: BPoSNFTInfo;
}