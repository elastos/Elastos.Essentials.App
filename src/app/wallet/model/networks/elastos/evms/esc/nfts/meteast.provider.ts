import BigNumber from "bignumber.js";
import { Logger } from "src/app/logger";
import type { Contract } from "web3-eth-contract";
import { ERC721Provider } from "../../../../evms/nfts/erc721.provider";
import { NFTAsset } from "../../../../evms/nfts/nftasset";

export class ElastosMeteastERC721Provider extends ERC721Provider {
  public supportedContractAddresses = [
    "0x3BeB5705Cae51eCEbecaAE7630F881cfDEfB1BF2", // Meteast mainnet
  ];

  public async fetchNFTAssetInformation(erc1155Contract: Contract, asset: NFTAsset, tokenURI: string, accountAddress: string): Promise<void> {
    try {
      // Meteast URIs have formats such as "meteast:json:QmQcxY1YXNRTETzE4aDPcZpKBtRHJyyAjsBFgXavXtRvRh"
      if (tokenURI && tokenURI.startsWith("meteast:json:")) {
        const assetJsonMetadataUri = tokenURI.substr(13);
        // Now fetch the json metadata from IPFS
        // Format:
        /*
         * {
              "version": "1",
              "type": "image",
              "name": "ela brickart",
              "description": "ela brickart",
              "image": "feeds:imgage:QmeV1FUaR58wmAznpZZnoezjJ97wTC81zYu4cehhuv1wxd",
              "kind": "jpg",
              "size": "4437354",
              "thumbnail": "feeds:imgage:QmSZjdUSu8qmgD8sng3TiVTKsTKzAggpaR4dt88Ekd5FuL"
          }
        */
        let metadataUrl = `https://ipfs.meteast.io/ipfs/${assetJsonMetadataUri}`;

        let jsonMetadataResponse = await fetch(metadataUrl);
        if (jsonMetadataResponse && jsonMetadataResponse.ok) {
          let jsonMetadata = await jsonMetadataResponse.json();
          console.log("meteast nft json:", jsonMetadata);

          // Display NFT ids in HEX to match meteast, instead of decimal
          asset.displayableId = `0x${new BigNumber(asset.id).toString(16)}`;

          if ("name" in jsonMetadata)
            asset.name = jsonMetadata["name"];

          if ("description" in jsonMetadata)
            asset.description = jsonMetadata["description"];

          let dataEntry = "data" in jsonMetadata && jsonMetadata.data ? jsonMetadata.data : {};

          if ("thumbnail" in dataEntry) {
            let thumbnailUri = dataEntry["thumbnail"] as string;
            // Expected uri format: "meteast:image:QmSZjdUSu8qmgD8sng3TiVTKsTKzAggpaR4dt88Ekd5FuL"
            if (thumbnailUri.startsWith("meteast:image")) {
              asset.imageURL = `https://ipfs.meteast.io/ipfs/${thumbnailUri.substr(thumbnailUri.lastIndexOf(":") + 1)}`;
            }
          }

          console.log("Asset", asset);
        }

      }
      else {
        Logger.warn("wallet", "Unsupported Meteast NFT uri ", tokenURI);
      }
    }
    catch (e) {
      Logger.warn("wallet", "Failed to retrieve extended info for pMeteastasar ERC721", e);
    }
  }
}