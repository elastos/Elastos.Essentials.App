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

let exec = cordova.exec;

class DappBrowserImpl implements DappBrowserPlugin.DappBrowser {
    constructor() {
    }

    open(url: string, target?: string, options?: string | DappBrowserPlugin.DappBrowserOptions): Promise<void> {
        if (typeof (options) != "string") {
            options = JSON.stringify(options);
        }
        return new Promise((resolve, reject) => {
            exec(() => {
                resolve();
            },
            (err) => {
                reject(err);
            },
            'DappBrowser', 'open', [url, target, options]);
        });
    }

    loadAfterBeforeload(strUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(() => {
                resolve();
            },
            (err) => {
                reject(err);
            },
            'DappBrowser', 'loadAfterBeforeload', [strUrl]);
        });
    }

    show(): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(() => {
                resolve();
            },
            (err) => {
                reject(err);
            },
            'DappBrowser', 'show', []);
        });
    }

    close(mode?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(() => {
                resolve();
            },
            (err) => {
                reject(err);
            },
            'DappBrowser', 'close', [mode]);
        });
    }

    hide(): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(() => {
                resolve();
            },
            (err) => {
                reject(err);
            },
            'DappBrowser', 'hide', []);
        });
    }

    executeScript(script: {
        file?: string;
        code?: string;
    }): Promise<any> {
        if (script.code) {
            return new Promise((resolve, reject) => {
                exec((ret) => {
                    resolve(ret);
                },
                (err) => {
                    reject(err);
                },
                'DappBrowser', 'injectScriptCode', [script.code, true]);
            });
        }
        else if (script.file) {
            return new Promise((resolve, reject) => {
                exec((ret) => {
                    resolve(ret);
                },
                (err) => {
                    reject(err);
                },
                'DappBrowser', 'injectScriptFile', [script.file, true]);
            });
        }
        else {
            throw new Error('insertCSS requires exactly one of code or file to be specified');
        }
    }

    insertCSS(css: {
        file?: string;
        code?: string;
    }): Promise<any> {
        if (css.code) {
            return new Promise((resolve, reject) => {
                exec((ret) => {
                    resolve(ret);
                },
                (err) => {
                    reject(err);
                },
                'DappBrowser', 'injectStyleCode', [css.code, true]);
            });
        }
        else if (css.file) {
            return new Promise((resolve, reject) => {
                exec((ret) => {
                    resolve(ret);
                },
                (err) => {
                    reject(err);
                },
                'DappBrowser', 'injectStyleFile', [css.file, true]);
            });
        }
        else {
            throw new Error('executeScript requires exactly one of code or file to be specified');
        }
    }

    loadUrl(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(() => {
                resolve();
            },
            (err) => {
                reject(err);
            },
            'DappBrowser', 'loadUrl', [url]);
        });
    }

    reload(): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(() => {
                resolve();
            },
            (err) => {
                reject(err);
            },
            'DappBrowser', 'reload', []);
        });
    }

    setTitle(title: string): Promise<void>{
        return new Promise((resolve, reject) => {
            exec(() => {
                resolve();
            },
            (err) => {
                reject(err);
            },
            'DappBrowser', 'setTitle', [title]);
        });
    }

    canGoBack(): Promise<Boolean>{
        return new Promise((resolve, reject) => {
            exec((ret) => {
                resolve(ret);
            },
            (err) => {
                reject(err);
            },
            'DappBrowser', 'canGoBack', []);
        });
    }

    goBack(): Promise<void>{
        return new Promise((resolve, reject) => {
            exec(() => {
                resolve();
            },
            (err) => {
                reject(err);
            },
            'DappBrowser', 'goBack', []);
        });
    }

    getWebViewShot(): Promise<string>{
        return new Promise((resolve, reject) => {
            exec((ret) => {
                resolve(ret);
            },
            (err) => {
                reject(err);
            },
            'DappBrowser', 'getWebViewShot', []);
        });
    }

    addEventListener(callback: (event: DappBrowserPlugin.DappBrowserEvent) => void) {
        function _onReceiveIntent(ret) {
            if ((typeof (ret.params) == "string") && (ret.params.length > 0)) {
                ret.params = JSON.parse(ret.params);
            }
            if (callback) {
                callback(ret);
            }
        }
        exec(_onReceiveIntent, null, 'DappBrowser', 'addEventListener');
    }

    removeEventListener(): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(() => {
                resolve();
            },
            (err) => {
                reject(err);
            },
            'DappBrowser', 'removeEventListener', []);
        });
    }
}

export = new DappBrowserImpl();
