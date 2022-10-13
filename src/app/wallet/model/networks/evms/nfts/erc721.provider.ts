import type { Contract } from "web3-eth-contract";
import { NFTAsset } from "./nftasset";

export abstract class ERC721Provider {
  // Deployed ERC721 contract addresses recognised as a known NFT type by this provider.
  public abstract supportedContractAddresses: string[];

  /**
   * Fetch additional data about the given asset and populates assets.
   */
  public abstract fetchNFTAssetInformation(erc721Contract: Contract, asset: NFTAsset, tokenURI: string, accountAddress: string): Promise<void>;
}