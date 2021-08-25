import { Injectable } from '@angular/core';
import { StandardCoinName } from '../model/coin';
import { Config } from '../config/Config';
import BigNumber from 'bignumber.js';
import { Logger } from 'src/app/logger';
import { UtxoType } from '../model/transaction.types';
import { CRProposalStatus } from '../../model/voting/cyber-republic/CRProposalStatus';
import { CRProposalsSearchResponse } from '../../model/voting/cyber-republic/CRProposalsSearchResponse';
import { ProducersSearchResponse } from 'src/app/dposvoting/model/nodes.model';
import { CRCouncilSearchResponse } from '../../model/voting/cyber-republic/CRCouncilSearchResult';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { EthTransaction, EthTokenTransaction, ERC20TokenInfo } from '../model/evm.types';

@Injectable({
    providedIn: 'root'
})
export class WalletJsonRPCService {
    static RETRY_TIMES = 3;

    constructor(
      private globalJsonRPCService: GlobalJsonRPCService,
      private globalElastosAPIService: GlobalElastosAPIService) {
    }

    // TODO: MOVE + MULTI NETWORKS
    // ETHSC:Get the real target address for the send transaction from ethsc to mainchain.
    public async getETHSCWithdrawTargetAddress(blockHeight: number, txHash: string) {
        const param = {
            method: 'getwithdrawtransactionsbyheight',
            params: {
                height: blockHeight
            },
        };

        const rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ETHSC_ORACLE);

        try {
            const result = await this.globalJsonRPCService.httpPost(rpcApiUrl, param);
            for (var i = 0; i < result.length; i++) {
                if ('0x' + result[i].txid === txHash) {
                    // TODO: crosschainassets has multiple value?
                    // TODO: define the result type
                    return result[i].crosschainassets[0].crosschainaddress;
                }
            }
        } catch (e) {
        }
        return '';
    }

    // ****************************************
    // ETHSC
    // ****************************************


    /* public getApiUrlTypeForRpc(elastosChainCode: string): ElastosApiUrlType {
      let apiUrlType = ElastosApiUrlType.ELA_RPC;
      switch (elastosChainCode) {
          case StandardCoinName.ELA:
              apiUrlType = ElastosApiUrlType.ELA_RPC;
              break;
          case StandardCoinName.IDChain:
              apiUrlType = ElastosApiUrlType.DID_RPC;
              break;
          case StandardCoinName.ETHSC:
              apiUrlType = ElastosApiUrlType.ETHSC_RPC;
              break;
          case StandardCoinName.ETHDID:
              apiUrlType = ElastosApiUrlType.EID_RPC;
              break;
          case StandardCoinName.ETHHECO:
              apiUrlType = ElastosApiUrlType.HECO_RPC;
              break;
          default:
              Logger.log("wallet", 'WalletJsonRPCService: RPC can not support ' + elastosChainCode);
              break;
      }
      return apiUrlType;
  } */


  public getApiUrlTypeForBrowser(elastosChainCode: string) {
    let apiUrlType = null;
    switch (elastosChainCode) {
        case StandardCoinName.ETHSC:
            apiUrlType = ElastosApiUrlType.ETHSC_BROWSER;
            break;
        case StandardCoinName.ETHHECO:
            apiUrlType = ElastosApiUrlType.HECO_BROWSER;
            break;
        default:
            Logger.log("wallet", 'WalletJsonRPCService: Browser api can not support ' + elastosChainCode);
            break;
    }
    return apiUrlType;
  }
}
