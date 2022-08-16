import { Injectable } from '@angular/core';
import { HTTP } from '@awesome-cordova-plugins/http/ngx';
import PQueue from 'p-queue';
import { Logger } from 'src/app/logger';
import { sleep } from '../helpers/sleep.helper';


type JSONRPCResponse = {
    error: string;
    id: string;
    jsonrpc: string;
    result: string;
};

export type RPCLimitatorSettings = {
    minRequestsInterval?: number; // Minimum time in milliseconds between 2 requests. Used to implement API call rate limits such as 'max 5 per second'.
}

/**
 * RPC limitators help us control the speed/conditions at which we send RPC API calls, in
 * order to deal with various third party services limitations.
 *
 * Usually, such limitations are required by block explorers as their APIs are expensive, not really by the main RPC APIs.
 */
type RPCLimitator = {
    // Provided settings by creator
    settings: RPCLimitatorSettings;

    // Internal state
    queue: PQueue;
}

@Injectable({
    providedIn: 'root'
})
export class GlobalJsonRPCService {
    public static instance: GlobalJsonRPCService = null;

    private limitators: Map<string, RPCLimitator> = new Map();

    constructor(private http: HTTP) {
        GlobalJsonRPCService.instance = this;
        /* this.registerLimitator("default", {
            minRequestsInterval: 100 // Let's be gentle, apply a max of 10 requests per second even if nothing is specified by default.
        }); */
    }

    public registerLimitator(name: string, settings: RPCLimitatorSettings = {}): RPCLimitator {
        let limitator: RPCLimitator = {
            queue: new PQueue({ concurrency: 1 }),
            settings
        };

        this.limitators.set(name, limitator);

        return limitator;
    }

    private getLimitator(name: string): RPCLimitator {
        if (!this.limitators.has(name)) {
            // The limitator doesn't exist, create a new one with default parameters and the given name
            // Note: we don't share a single default one to avoid different networks sharing the same default limitator.
            this.registerLimitator(name, {
                minRequestsInterval: 100 // Let's be gentle, apply a max of 10 requests per second even if nothing is specified by default.
            });
        }

        return this.limitators.get(name);
    }

    /**
     * limitatorName is the name of a previously registered limitator configuration.
     * Use such limitator usually "per network" in order to
     * limit the speed of api requests to not be rejected by API services.
     * If the limitator is not registered, the default one is used (no limitation).
     *
     * By default, this API parses the result and returns the result data from the parsed JSON for convenience.
     * It's though possible to get the raw result (only parsed as json) by setting returnRawResult to true. (Used by our Essentials Web3 provider).
     */
    httpPost(url: string, params: any, limitatorName = "default", timeout = 10000, returnRawResult = false, highPriority = false): Promise<any> {
        if (!url) {
            return null;
        }

        let limitator = this.getLimitator(limitatorName);

        let promiseResult = limitator.queue.add(() => {
            return new Promise((resolve, reject) => {
                const options = {
                    method: 'post',
                    data: params,
                    serializer: "json",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },
                    responseType: "text", // Force text response, we want to parse manually
                    timeout: timeout != -1 ? timeout / 1000 : undefined, // http plugin timeout is in seconds
                    followRedirect: true
                };

                this.http.sendRequest(url, <any>options).then((res) => {
                    if (res && res.data) {
                        try {
                            let result = JSON.parse(res.data);
                            if (returnRawResult) {
                                resolve(result);
                            }
                            else {
                                if (result instanceof Array) {
                                    resolve(result);
                                } else {
                                    if (result.error) {
                                        Logger.error("GlobalJsonRPCService", 'httpPost result.error :', result, ', rpc url:', url);
                                        reject(result.error);
                                    }
                                    else if (result.code && !(result.code == 200 || result.code == 1) && result.message) {
                                        reject(result.message);
                                    }
                                    else {
                                        resolve(result.result || result.success || '');
                                    }
                                }
                            }
                        } catch (e) {
                            //Logger.warn("GlobalJsonRPCService", 'httpPost exception:', e, resultString);
                            let paramsAsString = "invalid format";
                            try {
                                paramsAsString = JSON.stringify(params);
                            }
                            catch (e) { }

                            reject("Invalid JSON response returned by the JSON RPC for url: " + url + ", with params: " + paramsAsString);
                        }
                    }
                    else {
                        Logger.error('GlobalJsonRPCService', 'http get response with error:', res, ' url:', url);
                        reject("http get response with error");
                    }
                }, (err) => {
                    Logger.error('GlobalJsonRPCService', 'http post error:', err, ' url:', url);
                    reject(err);
                });
            });
        }, {
            // Some requests can have high priority to make sure that we send publish transaction requests
            // rapidly even if many ERC20 tokens price computations are queue for instance.
            priority: highPriority ? 1 : 0
        });

        this.applyPostRequestLimitatorConditions(limitator);

        return promiseResult;
    }

    httpGet(url: string, limitatorName = "default"): Promise<any> {
        let limitator = this.getLimitator(limitatorName);

        let promiseResult = limitator.queue.add(() => {
            return new Promise((resolve, reject) => {
                const options = {
                    method: 'get',
                    serializer: "json",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },
                    responseType: "json",
                    followRedirect: true
                };

                this.http.sendRequest(url, <any>options).then((res) => {
                    if (res && res.data)
                        resolve(res.data);  // Unblock the calling method
                    else {
                        Logger.error('GlobalJsonRPCService', 'http get response with error:', res, ' url:', url);
                        reject("http get response with error");
                    }
                }, (err) => {
                    Logger.error('GlobalJsonRPCService', 'http get error:', err, ' url:', url);
                    reject(err);
                });
            });
        });

        this.applyPostRequestLimitatorConditions(limitator);

        return promiseResult;
    }

    httpDelete(url: string, limitatorName = "default"): Promise<any> {
        let limitator = this.getLimitator(limitatorName);

        let promiseResult = limitator.queue.add(() => {
            return new Promise((resolve, reject) => {
                const options = {
                    method: 'delete',
                    serializer: "json",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },
                    responseType: "json",
                    followRedirect: true
                };

                this.http.sendRequest(url, <any>options).then((res) => {
                    if (res && !res.error)
                        resolve(res.data);  // Unblock the calling method
                    else {
                        Logger.error('GlobalJsonRPCService', 'http delete response with error:', res, ' url:', url);
                        reject("http delete response with error");
                    }
                }, (err) => {
                    Logger.error('GlobalJsonRPCService', 'http delete error:', err, ' url:', url);
                    reject(err);
                });
            });
        });

        this.applyPostRequestLimitatorConditions(limitator);

        return promiseResult;
    }

    private applyPostRequestLimitatorConditions(limitator: RPCLimitator) {
        // If we need to slow down the API requests, add a sleep to the queue to let the next API requet wait
        if (limitator.settings.minRequestsInterval) {
            // Don't let the caller wait so he gets the API response right when it arrives. But make the next one wait
            void limitator.queue.add(() => sleep(limitator.settings.minRequestsInterval));
        }
    }
}
