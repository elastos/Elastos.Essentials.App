import { Logger } from "src/app/logger";
import { BPoSERC721Service } from "src/app/wallet/services/evm/bpos.erc721.service";
import { EVMService } from "src/app/wallet/services/evm/evm.service";
import { WalletNetworkService } from "src/app/wallet/services/network.service";
import type Web3 from "web3";
import type { Contract } from "web3-eth-contract";
import { ERC721Provider } from "../../../../evms/nfts/erc721.provider";
import { NFTAsset } from "../../../../evms/nfts/nftasset";

const getInfoAbi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "getInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "referKey",
            "type": "bytes32"
          },
          {
            "internalType": "string",
            "name": "stakeAddress",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "genesisBlockHash",
            "type": "bytes32"
          },
          {
            "internalType": "uint32",
            "name": "startHeight",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "endHeight",
            "type": "uint32"
          },
          {
            "internalType": "int64",
            "name": "votes",
            "type": "int64"
          },
          {
            "internalType": "int64",
            "name": "voteRights",
            "type": "int64"
          },
          {
            "internalType": "bytes",
            "name": "targetOwnerKey",
            "type": "bytes"
          }
        ],
        "internalType": "struct ERC721UpradeableMinterBurnerPauser.StakeTickNFT",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export class ElastosBPoSERC721Provider extends ERC721Provider {
  public supportedContractAddresses = [
    "0xcfaBC7302a9294444741a9705E57c660aa7FC651", // BPoS NFT testnet
  ];

  public async fetchNFTAssetInformation(erc721Contract: Contract, asset: NFTAsset, tokenURI: string, accountAddress: string): Promise<void> {
    try {
        let ret = await BPoSERC721Service.instance.getBPoSNFTInfo(asset.id);
        Logger.log('wallet', 'ElastosBPoSERC721Provider getInfo ', ret)
        if (ret) {
          asset.bPoSNFTInfo = {
            endHeight: ret.endHeight,
            genesisBlockHash: ret.genesisBlockHash,
            referKey: ret.referKey,
            stakeAddress: ret.stakeAddress,
            startHeight: ret.startHeight,
            targetOwnerKey: ret.targetOwnerKey,
            voteRights: ret.voteRights,
            votes: ret.votes
          }
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