import isUtf8 from "isutf8";
import { Logger } from "src/app/logger";
import { AddEthereumChainParameter, SwitchEthereumChainParameter } from "src/app/model/ethereum/requestparams";
import { EVMNetwork } from "src/app/wallet/model/networks/evms/evm.network";
import { EthSignIntentResult } from "src/app/wallet/pages/intents/ethsign/intentresult";
import { PersonalSignIntentResult } from "src/app/wallet/pages/intents/personalsign/intentresult";
import { SignTypedDataIntentResult } from "src/app/wallet/pages/intents/signtypeddata/intentresult";
import { EditCustomNetworkIntentResult } from "src/app/wallet/pages/settings/edit-custom-network/intentresult";
import { WalletNetworkService } from "src/app/wallet/services/network.service";
import { JsonRpcResponse } from "web3-core-helpers";
import { GlobalIntentService } from "../../global.intent.service";
import { GlobalNativeService } from "../../global.native.service";
import { GlobalSwitchNetworkService } from "../../global.switchnetwork.service";
import { GlobalTranslationService } from "../../global.translation.service";
import { WalletService } from "src/app/wallet/services/wallet.service";
import { BTCMainNetNetwork } from "src/app/wallet/model/networks/btc/network/btc.mainnet.network";
import { MasterWallet } from "src/app/wallet/model/masterwallets/masterwallet";

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
  public static async handleSwitchNetworkRequest(params: any): Promise<EIP155ResultOrError<void>> {
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
        Logger.log("walletconnecteip155", "Already on the right network");
        return { result: null };
      }

      let networkSwitched = await GlobalSwitchNetworkService.instance.promptSwitchToNetwork(targetNetwork);
      if (networkSwitched) {
        Logger.log("walletconnecteip155", "Successfully switched to the new network");
        return { result: null };
      }
      else {
        Logger.log("walletconnecteip155", "Network switch cancelled");
        return { error: { code: -1, message: "Cancelled by user" } }
      }
    }
  }


  /**
   * Asks user to add a custom network.
   *
   * EIP-3085
   *
   * For the rpcUrls and blockExplorerUrls arrays, at least one element is required, and only the first element will be used.
   */
  public static async handleAddNetworkRequest(params: any): Promise<EIP155ResultOrError<void>> {
    // Check if this network already exists or not.
    let addParams: AddEthereumChainParameter = params[0];
    let chainId = parseInt(addParams.chainId);

    let networkWasAdded = false;
    let addedNetworkKey: string;
    let existingNetwork = WalletNetworkService.instance.getNetworkByChainId(chainId);
    if (!existingNetwork) {
      // Network doesn't exist yet. Send an intent to the wallet and wait for the response.
      let response: EditCustomNetworkIntentResult = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/addethereumchain", addParams);

      if (response && response.networkAdded) {
        networkWasAdded = true;
        addedNetworkKey = response.networkKey;
      }
    }

    // Not on this network, ask user to switch
    let activeNetwork = WalletNetworkService.instance.activeNetwork.value;
    if (!(activeNetwork instanceof EVMNetwork) || activeNetwork.getMainChainID() !== chainId) {
      let targetNetwork = existingNetwork;
      if (!targetNetwork)
        targetNetwork = WalletNetworkService.instance.getNetworkByKey(addedNetworkKey);

      if (targetNetwork) {
        // Ask user to switch but we don't mind the result.
        await GlobalSwitchNetworkService.instance.promptSwitchToNetwork(targetNetwork);
      }
    }

    if (networkWasAdded || existingNetwork) {
      // Network added, or network already existed => success, no matter if user chosed to switch or not
      Logger.log("walletconnecteip155", "Approving add network request");
      return { result: null }; // Successfully added or existing
    }
    else {
      Logger.log("walletconnecteip155", "Rejecting add network request");
      return {
        error: {
          code: 4001,
          message: "User rejected the request."
        }
      };
    }
  }

  public static async handleAddERCTokenRequest(params: any): Promise<EIP155ResultOrError<boolean>> {
    // Special EIP method used to add ERC20 tokens addresses to the wallet
    params = params[0] instanceof Array ? params[0] : params;
    let response: {
      action: string,
      result: {
        added: boolean
      }
    } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/adderctoken", params);

    if (response && response.result)
      return { result: response.result.added };
    else
      return { error: { code: -1, message: "Errored or cancelled" } };
  }


  public static async handleSignTypedDataRequest(method: string, params: any): Promise<EIP155ResultOrError<string>> {
    let useV4: boolean;
    switch (method) {
      case "eth_signTypedData_v3":
        useV4 = false;
        break;
      case "eth_signTypedData":
      case "eth_signTypedData_v4":
      default:
        useV4 = true;
        break;
    }

    let rawData: { payload: string, useV4: boolean } = {
      payload: params[1],
      useV4
    };
    let response: { result: SignTypedDataIntentResult } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/signtypeddata", rawData);

    if (response && response.result && response.result.signedData)
      return { result: response.result.signedData };
    else {
      return {
        error: {
          code: -1,
          message: "Errored or cancelled"
        }
      }
    }
  }

  public static async handlePersonalSignRequest(params: any): Promise<EIP155ResultOrError<string>> {
    let data = params[0];
    let account = params[1]; // TODO: for now we use the active account... not the requested one (could possibly be another account)

    let rawData = {
      data
    };
    let response: { result: PersonalSignIntentResult } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/personalsign", rawData);

    if (response && response.result && response.result.signedData) {
      return { result: response.result.signedData };
    }
    else {
      return {
        error: {
          code: -1,
          message: "Errored or cancelled"
        }
      };
    }
  }

  /**
   * Legacy eth_sign. Can receive either a raw hex buffer (unsafe), or a prefixed utf8 string (safe)
   */
  public static async handleEthSignRequest(params: any): Promise<EIP155ResultOrError<string>> {
    // params[0], 20 Bytes - address.
    // params[1], N Bytes - message to sign.
    const buffer = this.messageToBuffer(params[1]);
    const hex = this.bufferToHex(buffer);

    /**
     * Historically eth_sign can either receive:
     * - a very insecure raw message (hex) - supported by metamask
     * - a prefixed message (utf8) - standardized implementation
     *
     * So we detect the format here:
     * - if that's a utf8 prefixed string -> eth_sign = personal_sign
     * - if that's a buffer (insecure hex that could sign any transaction) -> insecure eth_sign screen
     */
    if (isUtf8(buffer)) {
      return EIP155RequestHandler.handlePersonalSignRequest(params);
    } else {
      let rawData = {
        data: hex
      };
      let response: { result: EthSignIntentResult } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/insecureethsign", rawData);

      if (response && response.result && response.result.signedData) {
        return { result: response.result.signedData };
      }
      else {
        return {
          error: {
            code: -1,
            message: "Errored or cancelled"
          }
        };
      }
    }
  }

  /**
   *
   * @param chainId Optional target chain id, base10 number
   */
  public static async handleSendTransactionRequest(params: any, chainId?: number): Promise<EIP155ResultOrError<string>> {
    try {
      Logger.log("walletconnecteip155", "Sending esctransaction intent", params[0]);
      let response: {
        action: string,
        result: {
          txid: string,
          status: "published" | "cancelled"
        }
      } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/esctransaction", {
        chainid: chainId,
        payload: { params }
      });
      Logger.log("walletconnecteip155", "Got esctransaction intent response", response);

      if (response && response.result && response.result.status === "published") {
        // Approve Call Request
        return { result: response.result.txid };
      }
      else {
        // Reject Call Request
        return {
          error: {
            code: -1,
            message: "Errored or cancelled - TODO: improve this error handler"
          }
        };
      }
    }
    catch (e) {
      Logger.error("walletconnecteip155", "Send intent error", e);
      // Reject Call Request
      return {
        error: {
          code: -1,
          message: e
        }
      };
    }
  }

  // ******************************************
  // Bitcoin Request: TODO move to a new file ?
  // ******************************************

  /**
   * Signs any payload, including random data or a real BTC raw transaction (CAUTION).
   *
   * @param
   * [{
   *  rawData: Any HEX payload to sign, a raw BTC transaction encoded to HEX.
   *  type:   "ecdsa" or "schnorr"
   * }]
   *
   * @return Concatenated signature R|S (32 bytes, 32 bytes), HEX.
   */
  public static async handleBitcoinSignDataTransactionRequest(params: any): Promise<EIP155ResultOrError<string>> {
    try {
      Logger.log("walletconnecteip155", "Bitcoin Sign data intent", params[0]);

      if (!(params[0].type)) {
        params[0].type = 'ecdsa'; //default
      }

      let response: {
        action: string,
        result: {
            signature: string,
        }
      } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/signbitcoindata", {
        payload: {
          params: [
            params[0]
          ]
        }
      });
      Logger.log("walletconnecteip155", "Got bitcpin sign data intent response", response);

      if (response && response.result && response.result.signature) {
        // Approve Call Request
        return { result: response.result.signature };
      }
      else {
        // Reject Call Request
        return {
          error: {
            code: -1,
            message: "Errored or cancelled - TODO: improve this error handler"
          }
        };
      }
    }
    catch (e) {
      Logger.error("walletconnecteip155", "Bitcoin sign data intent error", e);
      // Reject Call Request
      return {
        error: {
          code: -1,
          message: e
        }
      };
    }
  }

  public static async handleBitcoinSendRequest(params: any): Promise<EIP155ResultOrError<string>> {
    try {
      Logger.log("walletconnecteip155", "Bitcoin send intent", params[0]);

      let response: {
        action: string,
        result: {
            txid: string,
            status: "published" | "cancelled"
        }
      } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/sendbitcoin", {
          payload: {
              params: [
                params[0]
              ]
          }
      })

      if (response && response.result && response.result.txid) {
        // Approve Call Request
        return { result: response.result.txid };
      }
      else {
        // Reject Call Request
        return {
          error: {
            code: -1,
            message: "Errored or cancelled - TODO: improve this error handler"
          }
        };
      }
    }
    catch (e) {
      Logger.error("walletconnecteip155", "Send intent error", e);
      // Reject Call Request
      return {
        error: {
          code: -1,
          message: e
        }
      };
    }
  }

  public static async handleBitcoinSignMessageRequest(params: any): Promise<EIP155ResultOrError<string>> {
    try {
      Logger.log("walletconnecteip155", "Bitcoin sign message intent", params[0]);

      let response: {
        action: string,
        result: {
            signature: string,
        }
      } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/signbitcoinmessage", {
          payload: {
              params: [
                params[0]
              ]
          }
      })

      if (response && response.result && response.result.signature) {
        // Approve Call Request
        return { result: response.result.signature };
      }
      else {
        // Reject Call Request
        return {
          error: {
            code: -1,
            message: "Errored or cancelled - TODO: improve this error handler"
          }
        };
      }
    }
    catch (e) {
      Logger.error("walletconnecteip155", "Bitcon sign message intent error", e);
      // Reject Call Request
      return {
        error: {
          code: -1,
          message: e
        }
      };
    }
  }

  public static async handleBitcoinPushTxRequest(params: any): Promise<EIP155ResultOrError<string>> {
    try {
      Logger.log("walletconnecteip155", "Bitcoin push tx intent", params[0]);

      let response: {
        action: string,
        result: {
            txid: string,
            status: "published" | "cancelled"
        }
      } = await GlobalIntentService.instance.sendIntent("https://wallet.web3essentials.io/pushbitcointx", {
          payload: {
              params: [
                params[0]
              ]
          }
      })

      if (response && response.result && response.result.txid) {
        // Approve Call Request
        return { result: response.result.txid };
      }
      else {
        // Reject Call Request
        return {
          error: {
            code: -1,
            message: "Errored or cancelled - TODO: improve this error handler"
          }
        };
      }
    }
    catch (e) {
      Logger.error("walletconnecteip155", "Bitcon push tx intent error", e);
      // Reject Call Request
      return {
        error: {
          code: -1,
          message: e
        }
      };
    }
  }

  public static async handleBitcoinGetPublicKeyRequest(): Promise<EIP155ResultOrError<string>> {
    try {
      Logger.log("walletconnecteip155", "Bitcoin get public key intent");

      const masterWallet = WalletService.instance.getActiveMasterWallet();
      let publickey = await this.getWalletBitcoinPublicKey(masterWallet)

      if (publickey) {
        // Approve Call Request
        return { result: publickey };
      }
      else {
        // Reject Call Request
        return {
          error: {
            code: -1,
            message: "Errored or cancelled - TODO: improve this error handler"
          }
        };
      }
    }
    catch (e) {
      Logger.error("walletconnecteip155", "Bitcon get public key intent error", e);
      // Reject Call Request
      return {
        error: {
          code: -1,
          message: e
        }
      };
    }
  }

  public static async handleBitcoinGetAccountsRequest(): Promise<EIP155ResultOrError<string[]>> {
    try {
      Logger.log("walletconnecteip155", "Bitcoin get accounts intent");

      const masterWallet = WalletService.instance.getActiveMasterWallet();
      let address = await this.getWalletBitcoinAddress(masterWallet)

      if (address) {
        // Approve Call Request
        return { result: [address] };
      }
      else {
        // Reject Call Request
        return {
          error: {
            code: -1,
            message: "Errored or cancelled - TODO: improve this error handler"
          }
        };
      }
    }
    catch (e) {
      Logger.error("walletconnecteip155", "Bitcoin get accounts intent error", e);
      // Reject Call Request
      return {
        error: {
          code: -1,
          message: e
        }
      };
    }
  }

  // message: Bytes | string
  private static messageToBuffer(message: string | any): Buffer {
    var buffer = Buffer.from([]);
    try {
      if ((typeof (message) === "string")) {
        buffer = Buffer.from(message.replace("0x", ""), "hex");
      } else {
        buffer = Buffer.from(message);
      }
    } catch (err) {
      console.log(`messageToBuffer error: ${err}`);
    }
    return buffer;
  }

  private static bufferToHex(buf: Buffer): string {
    return "0x" + Buffer.from(buf).toString("hex");
  }

  // For Bitcoin
  private static getBitcoinNetwork(): BTCMainNetNetwork {
    return WalletNetworkService.instance.getNetworkByKey("btc") as BTCMainNetNetwork
  }

  private static async getWalletBitcoinAddress(masterWallet: MasterWallet): Promise<string> {
    const bitcoinNetwork = this.getBitcoinNetwork();
    const bitcoinNetworkWallet = await bitcoinNetwork.createNetworkWallet(masterWallet, false)
    const addresses = bitcoinNetworkWallet?.safe.getAddresses(0, 1, false, null);
    return addresses?.[0];
  }

  private static async getWalletBitcoinPublicKey(masterWallet: MasterWallet): Promise<string> {
    const bitcoinNetwork = this.getBitcoinNetwork();
    const bitcoinNetworkWallet = await bitcoinNetwork.createNetworkWallet(masterWallet, false)
    return bitcoinNetworkWallet?.safe.getPublicKey();
  }
}