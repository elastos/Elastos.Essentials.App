import { Logger } from "src/app/logger";
import { SwitchEthereumChainParameter } from "src/app/model/ethereum/requestparams";
import { EVMNetwork } from "src/app/wallet/model/networks/evms/evm.network";
import { WalletNetworkService } from "src/app/wallet/services/network.service";
import { JsonRpcResponse } from "web3-core-helpers";
import { GlobalNativeService } from "../../global.native.service";
import { GlobalSwitchNetworkService } from "../../global.switchnetwork.service";
import { GlobalTranslationService } from "../../global.translation.service";

export type EIP155ResultOrError<T> = {
  result?: T;
  error?: {
    code: number;
    message: string;
  }
}

/**
 * Helper class to get externally received wallet requests through wallet connect
 * v1 or v2, handle them in Essentials, and return a value.
 *
 * Each WC service (v1 or v2) is then responsible to send the responses.
 *
 * Only handles EVM requests (EIP155).
 */
export class EIP155RequestHandler {
  /**
    * Asks user to switch to another network as the client app needs it.
    *
    * EIP-3326
    *
    * If the error code (error.code) is 4902, then the requested chain has not been added
    * and you have to request to add it via wallet_addEthereumChain.
    */
  public static async handleSwitchNetworkRequest(params: any): Promise<EIP155ResultOrError<any>> {
    let switchParams: SwitchEthereumChainParameter = params[0];

    let chainId = parseInt(switchParams.chainId);
    let a: JsonRpcResponse
    let targetNetwork = WalletNetworkService.instance.getNetworkByChainId(chainId);
    if (!targetNetwork) {
      // We don't support this network
      GlobalNativeService.instance.errToast(GlobalTranslationService.instance.translateInstant("common.wc-not-supported-chainId", { chainId: switchParams.chainId }));
      return { error: { code: 4902, message: "Unsupported network" } };
    }
    else {
      // Do nothing if already on the right network
      let activeNetwork = WalletNetworkService.instance.activeNetwork.value;
      if ((activeNetwork instanceof EVMNetwork) && activeNetwork.getMainChainID() === chainId) {
        Logger.log("walletconnectv1", "Already on the right network");
        return { result: "" };
      }

      let networkSwitched = await GlobalSwitchNetworkService.instance.promptSwitchToNetwork(targetNetwork);
      if (networkSwitched) {
        Logger.log("walletconnectv1", "Successfully switched to the new network");
        return { result: "" };
      }
      else {
        Logger.log("walletconnectv1", "Network switch cancelled");
        return { error: { code: -1, message: "Cancelled by user" } }
      }
    }
  }
}