import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import Queue from "queue";
import { Logger } from 'src/app/logger';

type JSONRPCResponse = {
    error: string;
    id: string;
    jsonrpc: string;
    result: string;
};

@Injectable({
    providedIn: 'root'
})
export class GlobalJsonRPCService {
    public static instance: GlobalJsonRPCService = null;

    // Concurrency queues to ensure that we don't send too many API calls to the same RPC URL at the same
    // time, as rate limiting systems on nodes would reject some of our requests.
    private postQueue = new Queue({ autostart: true, concurrency: 1 });
    private getQueue = new Queue({ autostart: true, concurrency: 1 });

    constructor(private http: HttpClient) {
        GlobalJsonRPCService.instance = this;
    }

    httpPost(rpcApiUrl: string, param: any, timeout = -1): Promise<any> {
        if (!rpcApiUrl) {
            return null;
        }

        return new Promise((resolve, reject) => {
            this.postQueue.push(() => {
                return new Promise((resolveQueue, rejectQueue) => {
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
                                if (result instanceof Array) {
                                    resolve(result);
                                    resolveQueue(null);
                                } else {
                                    if (result.error) {
                                        Logger.error("GlobalJsonRPCService", 'httpPost error:', result);
                                        reject(result.error);
                                        resolveQueue(null);
                                    }
                                    else if (result.code && !(result.code == 200 || result.code == 1) && result.message) {
                                        reject(result.message);
                                        resolveQueue(null);
                                    }
                                    else {
                                        resolve(result.result || result.success || '');
                                        resolveQueue(null);
                                    }
                                }

                                resolve(result);
                                resolveQueue(null);
                            } catch (e) {
                                Logger.error("GlobalJsonRPCService", 'httpPost error:', e);
                                reject("Invalid JSON response returned by the JSON RPC");
                                resolveQueue(null);
                            }
                        }
                    };

                    request.ontimeout = function () {
                        Logger.error("GlobalJsonRPCService", 'httpPost timeout');
                        reject("Timeout");
                        resolveQueue(null);
                    };

                    request.onerror = function (error) {
                        Logger.error("GlobalJsonRPCService", 'httpPost error:', error);
                        reject(error);
                        resolveQueue(null);
                    }

                    try {
                        request.send(JSON.stringify(param));
                    } catch (error) {
                        reject("Connection error");
                        resolveQueue(null);
                    }
                });

                // return new Promise((resolve, reject) => {
                //     const httpOptions = {
                //         headers: new HttpHeaders({
                //             'Content-Type': 'application/json',
                //         })
                //     };
                //     // Logger.log("GlobalJsonRPCService", 'httpPost rpcApiUrl:', rpcApiUrl);
                //     this.http.post(rpcApiUrl, JSON.stringify(param), httpOptions)
                //         .subscribe((res: any) => {
                //             if (res) {
                //                 // Logger.warn("GlobalJsonRPCService", 'httpPost response:', res);
                //                 if (res instanceof Array) {
                //                     resolve(res);
                //                 } else {
                //                     if (res.error) {
                //                         Logger.error("GlobalJsonRPCService", 'httpPost error:', res);
                //                         reject(res.error);
                //                     } else {
                //                         resolve(res.result || '');
                //                     }
                //                 }
                //             } else {
                //                 Logger.error("GlobalJsonRPCService", 'httpPost get nothing!');
                //             }
                //         }, (err) => {
                //             Logger.error("GlobalJsonRPCService", 'JsonRPCService httpPost error:', JSON.stringify(err));
                //             reject(err);
                //         });
                // });
            });
        });
    }

    httpGet(url): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getQueue.push(() => {
                return new Promise((resolveQueue, rejectQueue) => {
                    this.http.get<any>(url).subscribe((res) => {
                        resolve(res);  // Unblock the calling method
                        resolveQueue(res); // Unblock the concurrency queue
                    }, (err) => {
                        Logger.error('GlobalJsonRPCService', 'http get error:', err);
                        reject(err);
                        resolveQueue(null);
                    });
                });
            });
        });
    }
}
