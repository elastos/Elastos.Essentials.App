import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import Queue from "promise-queue";
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
 */
type RPCLimitator = {
    // Provided settings by creator
    settings: RPCLimitatorSettings;

    // Internal state
    queue: Queue;
}

@Injectable({
    providedIn: 'root'
})
export class GlobalJsonRPCService {
    public static instance: GlobalJsonRPCService = null;

    // Concurrency queues to ensure that we don't send too many API calls to the same RPC URL at the same
    // time, as rate limiting systems on nodes would reject some of our requests.
    //private postQueue = new Queue(1); // Concurrency: 1
    //private getQueue = new Queue(1); // Concurrency: 1

    private limitators: Map<string, RPCLimitator> = new Map();

    constructor(private http: HttpClient) {
        GlobalJsonRPCService.instance = this;
        /* this.registerLimitator("default", {
            minRequestsInterval: 100 // Let's be gentle, apply a max of 10 requests per second even if nothing is specified by default.
        }); */
    }

    public registerLimitator(name: string, settings: RPCLimitatorSettings = {}): RPCLimitator {
        let limitator: RPCLimitator = {
            queue: new Queue(1),
            settings
        };

        this.limitators.set(name, limitator);

        return limitator;
    }

    private getLimitator(name: string): RPCLimitator {
        if (!this.limitators.has(name)) {
            // the limitator doesn't exist, create a new one with default parameters and the given name
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
    httpPost(rpcApiUrl: string, param: any, limitatorName = "default", timeout = 5000, returnRawResult = false): Promise<any> {
        if (!rpcApiUrl) {
            return null;
        }

        let limitator = this.getLimitator(limitatorName);

        let promiseResult = limitator.queue.add(() => {
            return new Promise((resolve, reject) => {
                var request = new XMLHttpRequest();

                request.open('POST', rpcApiUrl, true);
                request.setRequestHeader('Content-Type', 'application/json');
                if (timeout != -1) {
                    request.timeout = timeout;
                }

                request.onreadystatechange = function () {
                    if (request.readyState === 4 && request.timeout !== 1) {
                        let resultString = request.responseText;

                        try {
                            let result = JSON.parse(resultString);
                            if (returnRawResult) {
                                resolve(result);
                            }
                            else {
                                if (result instanceof Array) {
                                    resolve(result);
                                } else {
                                    if (result.error) {
                                        Logger.error("GlobalJsonRPCService", 'httpPost result.error :', result, ', rpc url:', rpcApiUrl);
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
                            Logger.error("GlobalJsonRPCService", 'httpPost exception:', e, resultString);
                            reject("Invalid JSON response returned by the JSON RPC");
                        }
                    }
                };

                request.ontimeout = function () {
                    Logger.error("GlobalJsonRPCService", 'httpPost timeout, rpc url:', rpcApiUrl);
                    reject("Timeout");
                };

                request.onerror = function (error) {
                    Logger.error("GlobalJsonRPCService", 'httpPost onerror:', error, ', rpc url:', rpcApiUrl);
                    reject(error);
                }

                try {
                    request.send(JSON.stringify(param));
                } catch (error) {
                    reject("Connection error");
                }
            });
        });

        this.applyPostRequestLimitatorConditions(limitator);

        return promiseResult;
    }

    httpGet(url: string, limitatorName = "default"): Promise<any> {
        let limitator = this.getLimitator(limitatorName);

        let promiseResult = limitator.queue.add(() => {
            return new Promise((resolve, reject) => {
                this.http.get<any>(url).subscribe((res) => {
                    resolve(res);  // Unblock the calling method
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
                this.http.delete<any>(url).subscribe((res) => {
                    resolve(res);  // Unblock the calling method
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
