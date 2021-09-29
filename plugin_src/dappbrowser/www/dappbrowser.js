"use strict";
/*
* Copyright (c) 2021 Elastos Foundation
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/
var exec = cordova.exec;
var DappBrowserImpl = /** @class */ (function () {
    function DappBrowserImpl() {
    }
    DappBrowserImpl.prototype.open = function (url, target, options) {
        if (typeof (options) != "string") {
            options = JSON.stringify(options);
        }
        return new Promise(function (resolve, reject) {
            exec(function () {
                resolve();
            }, function (err) {
                reject(err);
            }, 'DappBrowser', 'open', [url, target, options]);
        });
    };
    DappBrowserImpl.prototype.loadAfterBeforeload = function (strUrl) {
        return new Promise(function (resolve, reject) {
            exec(function () {
                resolve();
            }, function (err) {
                reject(err);
            }, 'DappBrowser', 'loadAfterBeforeload', [strUrl]);
        });
    };
    DappBrowserImpl.prototype.show = function () {
        return new Promise(function (resolve, reject) {
            exec(function () {
                resolve();
            }, function (err) {
                reject(err);
            }, 'DappBrowser', 'show', []);
        });
    };
    DappBrowserImpl.prototype.close = function () {
        return new Promise(function (resolve, reject) {
            exec(function () {
                resolve();
            }, function (err) {
                reject(err);
            }, 'DappBrowser', 'close', []);
        });
    };
    DappBrowserImpl.prototype.hide = function () {
        return new Promise(function (resolve, reject) {
            exec(function () {
                resolve();
            }, function (err) {
                reject(err);
            }, 'DappBrowser', 'hide', []);
        });
    };
    // executeScript(script: {
    //     file?: string;
    //     code?: string;
    // }): Promise<any> {
    //     return new Promise((resolve, reject) => {
    //         exec(() => {
    //             resolve();
    //         },
    //             (err) => {
    //                 reject(err);
    //             },
    //             'DappBrowser', 'executeScript', [script]);
    //     });
    // }
    // insertCSS(css: {
    //     file?: string;
    //     code?: string;
    // }): Promise<any> {
    //     return new Promise((resolve, reject) => {
    //         exec(() => {
    //             resolve();
    //         },
    //             (err) => {
    //                 reject(err);
    //             },
    //             'DappBrowser', 'insertCSS', [css]);
    //     });
    // }
    DappBrowserImpl.prototype.addEventListener = function (callback) {
        return new Promise(function (resolve, reject) {
            exec(function () {
                resolve();
            }, function (err) {
                reject(err);
            }, 'DappBrowser', 'addEventListener', [callback]);
        });
    };
    DappBrowserImpl.prototype.removeEventListener = function () {
        return new Promise(function (resolve, reject) {
            exec(function () {
                resolve();
            }, function (err) {
                reject(err);
            }, 'DappBrowser', 'removeEventListener', []);
        });
    };
    return DappBrowserImpl;
}());
module.exports = new DappBrowserImpl();
