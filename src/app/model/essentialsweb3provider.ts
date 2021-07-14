import { AbstractProvider } from "web3-core";
import { JsonRpcResponse, JsonRpcPayload } from "web3-core-helpers";
import { Logger } from "../logger";
import { ElastosApiUrlType, GlobalElastosAPIService } from "../services/global.elastosapi.service";

export class EssentialsWeb3Provider implements AbstractProvider {
    apiurlType: ElastosApiUrlType = ElastosApiUrlType.ETHSC_RPC
    rpcApiEndpoint: string = null; // RPC API server url. Do NOT read this value directly.

    constructor(urlType: ElastosApiUrlType) {
      this.apiurlType = urlType;
    }
    /**
     * Returns the previously fetched RPC API endpoint from Elastos Essentials's preferences
     */
    private getRPCApiEndpoint(): string {
        if (this.rpcApiEndpoint != null)
            return this.rpcApiEndpoint;

        return GlobalElastosAPIService.instance.getApiUrl(this.apiurlType);
    }

    private callJsonRPC(payload): Promise<any> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise(async (resolve, reject)=>{
            var request = new XMLHttpRequest();

            let rpcApiEndpoint = await this.getRPCApiEndpoint();

            request.open('POST', rpcApiEndpoint, true);
            request.setRequestHeader('Content-Type','application/json');
            request.timeout = 5000;

            request.onreadystatechange = function() {
                if (request.readyState === 4 && request.timeout !== 1) {
                    var result = request.responseText;

                    try {
                        Logger.log("global", "Ethereum JSON RPC call result:", result, "for payload:", payload);
                        result = JSON.parse(result);
                        resolve(result);
                    } catch(e) {
                        Logger.error("global", "Ethereum response: JSON parse error");
                        reject("Invalid JSON response returned by the JSON RPC");
                    }
                }
            };

            request.ontimeout = function() {
                reject("Timeout");
            };

            request.onerror = function(error) {
                console.error("RPC call error");
                reject(error);
            }

            try {
                request.send(JSON.stringify(payload));
            } catch(error) {
                reject("Connection error");
            }
        });
    }

    // Mandatory method: sendAsync()
    async sendAsync(payload: JsonRpcPayload, callback: (error: Error, result?: JsonRpcResponse) => void) {
        Logger.log("global", "Essentials Web3 provider sendAsync payload", payload);
        switch (payload.method) {
            // All methods not handled above are sent through JSON RPC API to the user-defined node url.
            default:
                try {
                    let result = await this.callJsonRPC(payload);
                    callback(null, result);
                }
                catch(e) {
                    Logger.error("global", "callJsonRPC catched");
                    callback(e);
                }
        }
    }
}