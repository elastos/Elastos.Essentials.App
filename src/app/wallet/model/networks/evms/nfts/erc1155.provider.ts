import { Contract } from "web3-eth-contract";
import { NFTAsset } from "./nftasset";

export abstract class ERC1155Provider {
  // Deployed ERC1155 contract addresses recognised as a known NFT type by this provider.
  // ie: "Feeds Pasar" on Elastos recognises 0x020c7303664bc88ae92cE3D380BF361E03B78B81 NFTs as this is were
  // it mints its NFTs.
  public abstract supportedContractAddresses: string[];

  /**
   * Fetch additional data about the given asset and populates assets.
   */
  public abstract fetchNFTAssetInformation(erc1155Contract: Contract, asset: NFTAsset, accountAddress: string): Promise<void>;
}