import { ERC721ResolvedInfo } from "../services/erc721.service";
import { NFTAsset } from "./nftasset";

/**
 * Class representing a NFT (ERC 721, 1155) contract (NOT a minted assets inside this contract).
 */
export class NFT {
  public name: string;
  public assets: NFTAsset[] = [];

  constructor(public type: NFTType, public contractAddress: string, public balance: number) {}

  public toSerializedNFT(): SerializedNFT {
    return {
      name: this.name,
      contractAddress: this.contractAddress,
      type: this.type,
      balance: this.balance
    };
  }

  public setResolvedInfo(resolvedInfo: ERC721ResolvedInfo) {
    this.name = resolvedInfo.name;
  }

  public static parse(serializedNFTJson: SerializedNFT): NFT {
    if (!serializedNFTJson)
      return null;

    let nft = new NFT(serializedNFTJson.type, serializedNFTJson.contractAddress, serializedNFTJson.balance);
    nft.name = serializedNFTJson.name;
    return nft;
  }

  /**
   * Returns the list of known assets for this NFT contract
   */
  public getAssets(): NFTAsset[] {
    return this.assets;
  }

  public getAssetById(assetId: string): NFTAsset {
    return this.assets.find(a => a.id === assetId);
  }
}

export enum NFTType {
  ERC721 = "ERC-721",
  ERC1155 = "ERC-1155"
}

export type SerializedNFT = {
  type: NFTType;
  contractAddress: string;
  name: string;
  balance: number; // Most recently known amount of tokens owned inside this NFT contract
}