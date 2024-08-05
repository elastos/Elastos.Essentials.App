import { Logger } from "src/app/logger";
import { BPoSERC721Service } from "src/app/wallet/services/evm/bpos.erc721.service";
import { EVMService } from "src/app/wallet/services/evm/evm.service";
import { WalletNetworkService } from "src/app/wallet/services/network.service";
import type Web3 from "web3";
import type { Contract } from "web3-eth-contract";
import { ERC721Provider } from "../../../../evms/nfts/erc721.provider";
import { NFTAsset } from "../../../../evms/nfts/nftasset";


export class ElastosBPoSERC721Provider extends ERC721Provider {
  public supportedContractAddresses = [
    // "0xcfaBC7302a9294444741a9705E57c660aa7FC651", // BPoS NFT testnet
    "0x6C91352F89b169843D8B50E1A34B60a46e363841", // BPoS NFT testnet
  ];

  public async fetchNFTAssetInformation(erc721Contract: Contract, asset: NFTAsset, tokenURI: string, accountAddress: string): Promise<void> {
    try {
        let ret = await BPoSERC721Service.instance.getBPoSNFTInfo(asset.id);
        Logger.log('wallet', 'ElastosBPoSERC721Provider getInfo ', ret)
        if (ret) {
          asset.bPoSNFTInfo = ret
        }
    }
    catch (e) {
      Logger.warn("wallet", "Failed to retrieve info for BPoS ERC721", e);
    }
  }

  private getWeb3(): Promise<Web3> {
    return EVMService.instance.getWeb3(WalletNetworkService.instance.activeNetwork.value);
  }
}