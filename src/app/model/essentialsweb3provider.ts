import Queue from "queue";
import { AbstractProvider } from "web3-core";
import { JsonRpcPayload, JsonRpcResponse } from "web3-core-helpers";
import { Logger } from "../logger";

// Concurrency queues to ensure that we don't send too many API calls to the same RPC URL at the same
// time, as rate limiting systems on nodes would reject some of our requests.
const callJsonRPCQueue = new Queue({ autostart: true, concurrency: 1 });

export class EssentialsWeb3Provider implements AbstractProvider {
    constructor(private rpcApiUrl: string) {
    }

    private callJsonRPC(payload): Promise<any> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise((resolve, reject) => {
            callJsonRPCQueue.push(() => {
                return new Promise((resolveQueue, rejectQueue) => {
                    var request = new XMLHttpRequest();

                    request.open('POST', this.rpcApiUrl, true);
                    request.setRequestHeader('Content-Type', 'application/json');
                    request.timeout = 5000;

                    request.onreadystatechange = function () {
                        if (request.readyState === 4 && request.timeout !== 1) {
                            var result = request.responseText;

                            try {
                                //Logger.log("global", "Ethereum JSON RPC call result:", result, "for payload:", payload);
                                result = JSON.parse(result);
                                resolve(result);
                                resolveQueue(null);
                            } catch (e) {
                                Logger.error("global", "Ethereum response: JSON parse error");
                                reject("Invalid JSON response returned by the JSON RPC: " + e);
                                rejectQueue(null);
                            }
                        }
                    };

                    request.ontimeout = function () {
                        reject("Timeout");
                        rejectQueue(null);
                    };

                    request.onerror = function (error) {
                        console.error("RPC call error");
                        reject(error);
                        rejectQueue(null);
                    }

                    try {
                        request.send(JSON.stringify(payload));
                    } catch (error) {
                        reject("Connection error");
                        rejectQueue(null);
                    }
                });
            });
        });
    }

    // Mandatory method: sendAsync()
    async sendAsync(payload: JsonRpcPayload, callback: (error: Error, result?: JsonRpcResponse) => void) {
        //Logger.log("global", "Essentials Web3 provider sendAsync payload", payload);
        switch (payload.method) {
            // All methods not handled above are sent through JSON RPC API to the user-defined node url.
            default:
                try {
                    let result = await this.callJsonRPC(payload);
                    callback(null, result);
                }
                catch (e) {
                    Logger.error("global", "callJsonRPC catched");
                    callback(e);
                }
        }
    }
}