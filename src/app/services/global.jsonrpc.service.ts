import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
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

    constructor(private http: HttpClient) {
        GlobalJsonRPCService.instance = this;
    }

    httpPost(rpcApiUrl: string, param: any, timeout = -1): Promise<any> {
        if (!rpcApiUrl) {
            return null;
        }
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
                        if (result instanceof Array) {
                            resolve(result);
                        } else {
                            if (result.error) {
                                Logger.error("GlobalJsonRPCService", 'httpPost error :', result, ', rpc url:', rpcApiUrl);
                                reject(result.error);
                            }
                            else if (result.code && result.code != 200 && result.message) {
                                reject(result.message);
                            }
                            else {
                                resolve(result.result || result.success || '');
                            }
                        }

                        resolve(result);
                    } catch (e) {
                        Logger.error("GlobalJsonRPCService", 'httpPost error:', e, ', rpc url:', rpcApiUrl);
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
                Logger.error("GlobalJsonRPCService", 'httpPost send exception:', error, ', rpc url:', rpcApiUrl);
                reject("Connection error");
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
    }

    httpGet(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.http.get<any>(url).subscribe((res) => {
                // Logger.log('GlobalJsonRPCService', res);
                resolve(res);
            }, (err) => {
                Logger.error('GlobalJsonRPCService', 'http get error:', err, ' url:', url);
                reject(err);
            });
        });
    }

    httpDelete(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.http.delete<any>(url).subscribe((res) => {
                // Logger.log('GlobalJsonRPCService', res);
                resolve(res);
            }, (err) => {
                Logger.error('GlobalJsonRPCService', 'http delete error:', err, ' url:', url);
                reject(err);
            });
        });
    }
}
