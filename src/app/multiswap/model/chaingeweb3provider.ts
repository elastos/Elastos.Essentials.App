import EventEmitter from "events";
import { Logger } from "src/app/logger";
import { GlobalJsonRPCService } from "src/app/services/global.jsonrpc.service";
import { EVMSafe } from "src/app/wallet/model/networks/evms/safes/evm.safe";
import { AnyMainCoinEVMSubWallet } from "src/app/wallet/model/networks/evms/subwallets/evm.subwallet";
import type { AbstractProvider } from "web3-core";
import type { JsonRpcPayload, JsonRpcResponse } from "web3-core-helpers";

type JsonRpcCallback = (error: Error | null, result?: JsonRpcResponse) => void;

/**
 * Web3 provider given to the chainge swap api.
 * This provider always uses the given input network to send transactions (normally, this should be the source swap token network).
 */
export class ChaingeWeb3Provider extends EventEmitter implements AbstractProvider {
  public chainId: number = null;
  private address: string = null;
  private ready = false;
  private idMapping = new IdMapping(); // Helper class to create and retrieve payload IDs for requests and responses.
  private callbacks = new Map<string | number, JsonRpcCallback>();
  private wrapResults = new Map<string | number, boolean>();

  constructor(private mainCoinSubWallet: AnyMainCoinEVMSubWallet) {
    super();

    this.chainId = mainCoinSubWallet.networkWallet.network.getMainChainID();
    this.address = this.mainCoinSubWallet.getCurrentReceiverAddress();
    this.ready = !!(this.chainId && this.address);

    this.emitConnect(this.chainId);
  }

  /**
   * Sets the active wallet chain ID and informs listeners about the change.
   */
  public setChainId(chainId: number) {
    this.chainId = chainId;
    this.ready = !!(this.chainId && this.address);

    // EIP1193 SPEC:
    // - networkChanged will emit the network ID as a decimal string
    // - chainChanged will emit the chain ID as a hexadecimal string
    this.emit("chainChanged", '0x' + Number(this.chainId).toString(16));
    this.emit("networkChanged", Number(this.chainId).toString(10));
  }

  /**
   * Sets the active wallet address and informs listeners about the change.
   */
  public setAddress(address: string) {
    const lowerAddress = (address || "").toLowerCase();
    this.address = lowerAddress;
    this.ready = !!(this.chainId && this.address);

    this.emit("accountsChanged", [address]);
  }

  public isConnected(): boolean {
    return true;
  }

  public enable(): Promise<void> {
    // Nothing to do - already active
    return Promise.resolve();
  }

  private emitConnect(chainId: number) {
    this.emit("connect", { chainId: chainId });
  }

  private eth_accounts(): string[] {
    return this.address ? [this.address] : [];
  }

  private eth_coinbase(): string {
    return this.address;
  }

  private net_version(): string {
    return this.chainId.toString(10) || null;
  }

  private eth_chainId(): string {
    return "0x" + this.chainId.toString(16);
  }

  public request(payload: JsonRpcPayload): Promise<any> {
    // 'this' points to window in methods like web3.eth.getAccounts()
    var that = this;
    if (!(this instanceof ChaingeWeb3Provider)) {
      that = (window as any).ethereum;
    }

    return that._request(payload, false);
  }

  /**
   * Internal request handler that receives JsonRpcPayloads and returns JsonRpcResponses.
   */
  private _request(payload: JsonRpcPayload, wrapResult = true): Promise<JsonRpcResponse> {
    this.idMapping.tryIntifyId(payload);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
    return new Promise<JsonRpcResponse>(async (resolve, reject) => {
      if (!payload.id) {
        payload.id = Utils.genId();
      }
      this.callbacks.set(payload.id as any, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
      this.wrapResults.set(payload.id, wrapResult);

      switch (payload.method) {
        case "eth_accounts":
          this.sendResponse(payload.id, this.eth_accounts());
          break;
        case "eth_chainId":
          this.sendResponse(payload.id, this.eth_chainId());
          break;
        case "eth_coinbase":
          this.sendResponse(payload.id, this.eth_coinbase());
          break;
        case "eth_sendTransaction":
          Logger.log('ChaingeWeb3Provider', '_request eth_sendTransaction', payload)
          let txId = await this.sendTransaction(payload.params[0])
          this.sendResponse(payload.id, txId);
          break;
        case "net_version":
        case "eth_sign":
        case "personal_sign":
        case "personal_ecRecover":
        case "eth_signTypedData_v3":
        case "eth_signTypedData":
        case "eth_signTypedData_v4":
        case "wallet_watchAsset":
        case "wallet_switchEthereumChain":
        case "wallet_addEthereumChain":
        case "eth_newFilter":
        case "eth_newBlockFilter":
        case "eth_newPendingTransactionFilter":
        case "eth_uninstallFilter":
        case "eth_requestAccounts":
        case "eth_subscribe":
          throw new Error(`The ChaingeWeb3Provider does not support the ${payload.method} method.`);
        default:
          // call upstream rpc
          this.callbacks.delete(payload.id as any);
          this.wrapResults.delete(payload.id);

          this.callJsonRPC(payload).then(response => {
            wrapResult ? resolve(response) : resolve(response.result);
          }).catch(e => {
            console.log("callJsonRPC catched");
            reject(e);
          });
      }
    });
  }

  private sendResponse(id: string | number, result: unknown): void {
    let originId = this.idMapping.tryPopId(id) || id;
    let callback = this.callbacks.get(id);
    let wrapResult = this.wrapResults.get(id);
    let data: JsonRpcResponse = {
      jsonrpc: "2.0",
      id: originId
    };

    data.result = result;

    if (callback) {
      wrapResult ? callback(null, data) : callback(null, result as any);
      this.callbacks.delete(id);
    } else {
      console.log(`callback id: ${id} not found`);
    }
  }

  private callJsonRPC(payload: JsonRpcPayload): Promise<JsonRpcResponse> {
    return GlobalJsonRPCService.instance.httpPost(this.mainCoinSubWallet.networkWallet.network.getRPCUrl(), payload, null, 5000, true, true);
  }

  /**
 * @deprecated Use request() method instead.
 * https://docs.metamask.io/guide/ethereum-provider.html#legacy-methods
 */
  public sendAsync(payload: JsonRpcPayload, callback: (error: Error, result?: JsonRpcResponse) => void) {
    // 'this' points to window in methods like web3.eth.getAccounts()
    var that = this;
    if (!(this instanceof ChaingeWeb3Provider)) {
      that = (window as any).ethereum;
    }

    that._request(payload)
      .then((data) => callback(null, data))
      .catch((error) => callback(error, null));
  }

  private async sendTransaction(params) {
    let safe = <EVMSafe><unknown>this.mainCoinSubWallet.networkWallet.safe;

    let unsignedTx = null;
    if (params.data === '0x') {
      // Native token, the unit of value is wei
      unsignedTx = await safe.createTransferTransaction(params.to, params.value, params.gasPrice, params.gasLimit, params.nonce);
    } else {
      unsignedTx = await safe.createContractTransaction(params.to, params.value, params.gasPrice, params.gasLimit, params.nonce, params.data);
    }

    const txId = await this.sendUnsignedTransaction(this.mainCoinSubWallet, unsignedTx);
    Logger.log('ChaingeWeb3Provider', 'sendTransaction txId', txId)
    return txId;
  }

  private async sendUnsignedTransaction(mainCoinSubWallet: AnyMainCoinEVMSubWallet, unsignedTx: any): Promise<string> {
    let sendResult = await mainCoinSubWallet.signAndSendRawTransaction(unsignedTx, null, false, false, false);
    if (!sendResult || !sendResult.published)
      return null;
    else
      return sendResult.txid;
  }
}

class IdMapping {
  private intIds = new Map();

  constructor() {
  }

  tryIntifyId(payload) {
    if (!payload.id) {
      payload.id = Utils.genId();
      return;
    }
    if (typeof payload.id !== "number") {
      let newId = Utils.genId();
      this.intIds.set(newId, payload.id);
      payload.id = newId;
    }
  }

  tryRestoreId(payload) {
    let id = this.tryPopId(payload.id);
    if (id) {
      payload.id = id;
    }
  }

  tryPopId(id) {
    let originId = this.intIds.get(id);
    if (originId) {
      this.intIds.delete(id);
    }
    return originId;
  }
}

class Utils {
  static genId() {
    return new Date().getTime() + Math.floor(Math.random() * 1000);
  }
}
