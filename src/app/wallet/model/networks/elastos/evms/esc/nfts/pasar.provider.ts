import BigNumber from "bignumber.js";
import { Logger } from "src/app/logger";
import type { Contract } from "web3-eth-contract";
import { ERC1155Provider } from "../../../../evms/nfts/erc1155.provider";
import { NFTAsset } from "../../../../evms/nfts/nftasset";

export class ElastosPasarERC1155Provider extends ERC1155Provider {
  public supportedContractAddresses = [
    "0x020c7303664bc88ae92cE3D380BF361E03B78B81"
  ];

  public async fetchNFTAssetInformation(erc1155Contract: Contract, asset: NFTAsset, accountAddress: string): Promise<void> {
    // Retrieve how many assets are owned by this account
    //const assetsNumber = await erc1155Contract.methods.balanceOf(accountAddress, tokenId).call();
    //console.log("assetsNumber", assetsNumber);
    // -> 1

    try {
      const uri = await erc1155Contract.methods.uri(asset.id).call() as string;
      console.log("uri", uri);

      // Pasar URIs have formats such as "feeds:json:QmQcxY1YXNRTETzE4aDPcZpKBtRHJyyAjsBFgXavXtRvRh"
      if (uri && (uri.startsWith("feeds:json:") || uri.startsWith("pasar:json:"))) {
        const assetJsonMetadataUri = uri.substr(11);
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
        let jsonMetadataResponse = await fetch(`https://ipfs.trinity-tech.io/ipfs/${assetJsonMetadataUri}`);
        if (jsonMetadataResponse && jsonMetadataResponse.ok) {
          let jsonMetadata = await jsonMetadataResponse.json();
          console.log("pasar nft json:", jsonMetadata);

          // Display pasar NFT ids in HEX to match pasar, instead of decimal
          asset.displayableId = `0x${new BigNumber(asset.id).toString(16)}`;

          if ("name" in jsonMetadata)
            asset.name = jsonMetadata["name"];

          if ("description" in jsonMetadata)
            asset.description = jsonMetadata["description"];

          let dataEntry = "data" in jsonMetadata && jsonMetadata.data ? jsonMetadata.data : {};

          if ("thumbnail" in jsonMetadata) {
            let thumbnailUri = jsonMetadata["thumbnail"] as string;
            // Expected uri format: "feeds:imgage:QmSZjdUSu8qmgD8sng3TiVTKsTKzAggpaR4dt88Ekd5FuL"
            if (thumbnailUri.startsWith("feeds:imgage") || thumbnailUri.startsWith("feeds:image")) {
              asset.imageURL = `https://ipfs.trinity-tech.io/ipfs/${thumbnailUri.substr(thumbnailUri.lastIndexOf(":") + 1)}`;
            }
          }
          else if ("thumbnail" in dataEntry) {
            let thumbnailUri = dataEntry["thumbnail"] as string;
            // Expected uri format: "pasar:imgage:QmSZjdUSu8qmgD8sng3TiVTKsTKzAggpaR4dt88Ekd5FuL"
            if (thumbnailUri.startsWith("pasar:image")) {
              asset.imageURL = `https://ipfs.trinity-tech.io/ipfs/${thumbnailUri.substr(thumbnailUri.lastIndexOf(":") + 1)}`;
            }
          }

          console.log("Asset", asset);
        }

      }
      else {
        Logger.warn("wallet", "Unsupported Pasar NFT uri ", uri);
      }
    }
    catch (e) {
      Logger.warn("wallet", "Failed to retrieve extended info for pasar ERC1155", e);
    }
    // --> feeds:json:QmQcxY1YXNRTETzE4aDPcZpKBtRHJyyAjsBFgXavXtRvRh
    //      --> https://ipfs.trinity-tech.io/ipfs/QmQcxY1YXNRTETzE4aDPcZpKBtRHJyyAjsBFgXavXtRvRh


  }
}