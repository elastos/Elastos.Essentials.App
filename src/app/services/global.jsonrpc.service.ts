import { HttpClient, HttpHeaders } from '@angular/common/http';
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
    constructor(private http: HttpClient) {
    }

    httpPost(rpcApiUrl: string, param: any): Promise<any> {
        if (!rpcApiUrl) {
            return null;
        }

        return new Promise((resolve, reject) => {
            const httpOptions = {
                headers: new HttpHeaders({
                    'Content-Type': 'application/json',
                })
            };
            // Logger.log("GlobalJsonRPCService", 'httpPost rpcApiUrl:', rpcApiUrl);
            this.http.post(rpcApiUrl, JSON.stringify(param), httpOptions)
                .subscribe((res: any) => {
                    if (res) {
                        // Logger.warn("GlobalJsonRPCService", 'httpPost response:', res);
                        if (res instanceof Array) {
                            resolve(res);
                        } else {
                            if (res.error) {
                                Logger.error("GlobalJsonRPCService", 'httpPost error:', res);
                                reject(res.error);
                            } else {
                                resolve(res.result || '');
                            }
                        }
                    } else {
                        Logger.error("GlobalJsonRPCService", 'httpPost get nothing!');
                    }
                }, (err) => {
                    Logger.error("GlobalJsonRPCService", 'JsonRPCService httpPost error:', JSON.stringify(err));
                    reject(err);
                });
        });
    }

    httpGet(url): Promise<any> {
        return new Promise((resolve, reject) => {
            this.http.get<any>(url).subscribe((res) => {
                // Logger.log('GlobalJsonRPCService', res);
                resolve(res);
            }, (err) => {
                Logger.error('GlobalJsonRPCService', 'http get error:', err);
                reject(err);
            });
        });
    }
}
