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

 import Foundation

 @objc(DappBrowserPlugin)
 class DappBrowserPlugin : CDVPlugin {
    var callbackId: String? = nil;
    var msgListener: ((Int, String, String)->(Void))? = nil;
    var intentCallbackId: String? = nil;
    var intentListener:  ((String, String?, String, Int64)->(Void))? = nil;

    private var _beforeload: String = "";
//    private var _waitForBeforeload: Bool = false;
    private var _previousStatusBarStyle: NSInteger = -1;
    var webViewHandler: WebViewHandler!

    static var instance: DappBrowserPlugin?;

    static let kDappBrowserTargetSelf = "_self"
    static let kDappBrowserTargetSystem = "_system"
    static let kDappBrowserTargetBlank = "_blank"

    static func getInstance() -> DappBrowserPlugin {
        return instance!;
    }

    override func pluginInitialize() {
        DappBrowserPlugin.instance = self;
    }

    //---------------------------------------------------------
    func success(_ command: CDVInvokedUrlCommand) {
        let result = CDVPluginResult(status: CDVCommandStatus_OK)

        self.commandDelegate?.send(result, callbackId: command.callbackId)
    }
     
     func success(_ command: CDVInvokedUrlCommand, _ retAsBool: Bool) {
         let result = CDVPluginResult(status: CDVCommandStatus_OK,
                                      messageAs: retAsBool);

         self.commandDelegate?.send(result, callbackId: command.callbackId)
     }

    func success(_ command: CDVInvokedUrlCommand, _ retAsString: String) {
        let result = CDVPluginResult(status: CDVCommandStatus_OK,
                                     messageAs: retAsString);

        self.commandDelegate?.send(result, callbackId: command.callbackId)
    }

    func success(_ callbackId: String, retAsDict: [String : Any]) {
        let result = CDVPluginResult(status: CDVCommandStatus_OK,
                                     messageAs: retAsDict);

        self.commandDelegate?.send(result, callbackId: callbackId)
    }

    func success(_ callbackId: String, retAsArray: [String]) {
        let result = CDVPluginResult(status: CDVCommandStatus_OK,
                                     messageAs: retAsArray);

        self.commandDelegate?.send(result, callbackId: callbackId)
    }

    func error(_ command: CDVInvokedUrlCommand, _ retAsString: String) {
        let result = CDVPluginResult(status: CDVCommandStatus_ERROR,
                                     messageAs: retAsString);

        self.commandDelegate?.send(result, callbackId: command.callbackId)
    }

    func sendCallback(_ command: CDVInvokedUrlCommand, _ status: CDVCommandStatus, _ keepCallback:Bool, _ retAsString: String?) {
        var result: CDVPluginResult? = nil;
        if (status != CDVCommandStatus_NO_RESULT) {
            result = CDVPluginResult(status: status, messageAs: retAsString);
        }
        else {
            result = CDVPluginResult(status: CDVCommandStatus_NO_RESULT);
        }
        result?.setKeepCallbackAs(keepCallback);

        self.commandDelegate?.send(result, callbackId: command.callbackId)
    }


    @objc override func onReset() {
//        self.cloes(nil);
    }

    @objc func close(_ command: CDVInvokedUrlCommand) {
        if (self.webViewHandler != nil) {
            let mode = command.arguments[0] as? String;
            self.webViewHandler.close();

        }

        // Things are cleaned up in browserExit.
        
        self.success(command);
    }

    func isSystemUrl(_ url: URL) -> Bool {
        if (url.absoluteString == "itunes.apple.com") {
            return true;
        }

        return false;
    }

    @objc func open(_ command: CDVInvokedUrlCommand) {
        let url = command.arguments[0] as? String;
        var target = command.arguments[1] as? String ?? DappBrowserPlugin.kDappBrowserTargetSelf;
        let options = command.arguments[2] as? String ?? "";

        var pluginResult = CDVPluginResult(status: CDVCommandStatus_ERROR,
                                       messageAs: "incorrect number of arguments");

        if (url != nil) {
            let baseUrl = self.webViewEngine.url();
            let absoluteUrl = URL(string: url!, relativeTo: baseUrl)?.absoluteURL;

            if (absoluteUrl != nil) {
                if (self.isSystemUrl(absoluteUrl!)) {
                    target = DappBrowserPlugin.kDappBrowserTargetSystem;
                }

                do {
                    if (target == DappBrowserPlugin.kDappBrowserTargetSelf) {
                        self.openInCordovaWebView(absoluteUrl!, withOptions:options);
                    }
                    else if (target == DappBrowserPlugin.kDappBrowserTargetSystem) {
                        self.openInSystem(absoluteUrl!);
                    } else { // _webview or anything else
                        try self.openInDappBrowser(url: url!, withOptions:options);
                    }
                } catch let error {
                    self.error(command, error.localizedDescription);
                }

                pluginResult = CDVPluginResult(status: CDVCommandStatus_OK);
            }
        }

        self.commandDelegate?.send(pluginResult, callbackId: command.callbackId)
    }

    func openInDappBrowser(url: String, withOptions options: String) throws {
        let browserOptions = try DappBrowserOptions.parseOptions(options);
        self.webViewHandler = WebViewHandler(self, url, browserOptions);
    }

    func openInCordovaWebView(_ url: URL, withOptions options: String) {
        let request = URLRequest.init(url: url);
        // the webview engine itself will filter for this according to <allow-navigation> policy
        // in config.xml for cordova-ios-4.0
        self.webViewEngine.load(request);
    }

    func openInSystem(_ url: URL) {
        if (UIApplication.shared.canOpenURL(url)) {
            NotificationCenter.default.post(Notification.init(name: NSNotification.Name.CDVPluginHandleOpenURL, object: url));
            UIApplication.shared.open(url);
        }
    }

    @objc func loadAfterBeforeload(_ command: CDVInvokedUrlCommand) {
        let urlStr = command.arguments[0] as? String;

        if (self.webViewHandler == nil) {
            NSLog("Tried to invoke loadAfterBeforeload on DAB after it was closed.");
            return;
        }

        if (urlStr == nil) {
            NSLog("loadAfterBeforeload called with nil argument, ignoring.");
            return;
        }

        self.webViewHandler.loadAfterBeforeload(urlStr!);
    }
     
     
     @objc func show(_ command: CDVInvokedUrlCommand) {
         if (self.webViewHandler != nil) {
             self.webViewHandler.show()
         }
         self.success(command);
     }

    
     @objc func hide(_ command: CDVInvokedUrlCommand) {
         if (self.webViewHandler != nil) {
             self.webViewHandler.hide();
         }
         self.success(command);
     }
     
     @objc func canGoBack(_ command: CDVInvokedUrlCommand) {
         var canGoBack = false;
         if (self.webViewHandler != nil) {
             canGoBack = self.webViewHandler.canGoBack()
         }

         self.success(command, canGoBack);
     }

    
     @objc func goBack(_ command: CDVInvokedUrlCommand) {
         if (self.webViewHandler != nil) {
             self.webViewHandler.goBack();
         }
         self.success(command);
     }
     
     @objc func getWebViewShot(_ command: CDVInvokedUrlCommand) {
         var ret = "";
         if (webViewHandler != nil) {
             ret = webViewHandler.getWebViewShot();
         }
         self.success(command, ret);
     }
     
     @objc func addEventListener(_ command: CDVInvokedUrlCommand) {
         self.callbackId = command.callbackId;
         // Don't return any result now
         let result = CDVPluginResult(status: CDVCommandStatus_NO_RESULT);
         result?.setKeepCallbackAs(true);
         self.commandDelegate?.send(result, callbackId: command.callbackId)
     }

    
     @objc func removeEventListener(_ command: CDVInvokedUrlCommand) {
         self.callbackId = nil;
         let result = CDVPluginResult(status: CDVCommandStatus_NO_RESULT);
         result?.setKeepCallbackAs(false);
         self.commandDelegate?.send(result, callbackId: command.callbackId)
     }

    // This is a helper method for the inject{Script|Style}{Code|File} API calls, which
    // provides a consistent method for injecting JavaScript code into the document.
    //
    // If a wrapper string is supplied, then the source string will be JSON-encoded (adding
    // quotes) and wrapped using string formatting. (The wrapper string should have a single
    // '%@' marker).
    //
    // If no wrapper is supplied, then the source string is executed directly.

    func injectDeferredObject(_ source: String, withWrapper jsWrapper: String?) {
        // Ensure a message handler bridge is created to communicate with the CDVWKInAppBrowserViewController
        self.evaluateJavaScript(String(format: "(function(w){if(!w._cdvMessageHandler) {w._cdvMessageHandler = function(id,d){w.webkit.messageHandlers.%@.postMessage({d:d, id:id});}}})(window)", WebViewHandler.DAB_BRIDGE_NAME));

        if (jsWrapper != nil) {
            let jsonData = try? JSONSerialization.data(withJSONObject:[source], options: []);
            let sourceArrayString = String.init(data: jsonData!, encoding: .utf8);

            if ((sourceArrayString) != nil) {
                let startIndex = sourceArrayString!.index(sourceArrayString!.startIndex, offsetBy: 1)
                let endIndex =  sourceArrayString!.index(sourceArrayString!.endIndex, offsetBy: -1)
                let sourceString = String(sourceArrayString![startIndex..<endIndex])

                let jsToInject = String(format:jsWrapper!, sourceString);
                self.evaluateJavaScript(jsToInject);
            }
        }
        else {
            self.evaluateJavaScript(source);
        }
    }

    //Synchronus helper for javascript evaluation
    func evaluateJavaScript(_ script: String) {
        if (webViewHandler != nil) {
            self.webViewHandler.webView.evaluateJavaScript(script, completionHandler: { (result, error) in
                if (error == nil) {
                    if (result != nil) {
                        NSLog("evaluateJavaScript result : \(result)");
                    }
                }
                else {
                    NSLog("evaluateJavaScript error : %@ : %@", error!.localizedDescription, script);
                }
            });
        }
    }

    @objc func injectScriptCode(_ command: CDVInvokedUrlCommand) {
        guard let source = command.arguments[0] as? String else {
            return;
        }

        var jsWrapper: String? = nil;

        if (command.callbackId != nil && command.callbackId != "INVALID") {
            jsWrapper = String(format: "_cdvMessageHandler('%@',JSON.stringify([eval(%%@)]));", command.callbackId);
        }
        self.injectDeferredObject(source, withWrapper:jsWrapper);
    }

    @objc func injectScriptFile(_ command: CDVInvokedUrlCommand) {
        guard let source = command.arguments[0] as? String else {
            return;
        }

        var jsWrapper: String? = nil;

        if (command.callbackId != nil && command.callbackId != "INVALID") {
            jsWrapper = String(format: "(function(d) { var c = d.createElement('script'); c.src = %%@; c.onload = function() { _cdvMessageHandler('%@'); }; d.body.appendChild(c); })(document)", command.callbackId);
        }
        else {
            jsWrapper = "(function(d) { var c = d.createElement('script'); c.src = %@; d.body.appendChild(c); })(document)";
        }
        self.injectDeferredObject(source, withWrapper:jsWrapper);
    }

    @objc func injectStyleCode(_ command: CDVInvokedUrlCommand) {
        guard let source = command.arguments[0] as? String else {
            return;
        }

        var jsWrapper: String? = nil;

        if (command.callbackId != nil && command.callbackId != "INVALID") {
            jsWrapper = String(format: "(function(d) { var c = d.createElement('style'); c.innerHTML = %%@; c.onload = function() { _cdvMessageHandler('%@'); }; d.body.appendChild(c); })(document)", command.callbackId);
        }
        else {
            jsWrapper = "(function(d) { var c = d.createElement('style'); c.innerHTML = %@; d.body.appendChild(c); })(document)";
        }
        self.injectDeferredObject(source, withWrapper:jsWrapper);
    }

    @objc func injectStyleFile(_ command: CDVInvokedUrlCommand) {
        guard let source = command.arguments[0] as? String else {
            return;
        }

        var jsWrapper: String? = nil;

        if (command.callbackId != nil && command.callbackId != "INVALID") {
            jsWrapper = String(format: "(function(d) { var c = d.createElement('link'); c.rel='stylesheet'; c.type='text/css'; c.href = %%@; c.onload = function() { _cdvMessageHandler('%@'); }; d.body.appendChild(c); })(document)", command.callbackId);
        }
        else {
            jsWrapper = "(function(d) { var c = d.createElement('link'); c.rel='stylesheet', c.type='text/css'; c.href = %@; d.body.appendChild(c); })(document)";
        }
        self.injectDeferredObject(source, withWrapper:jsWrapper);
    }

    public func sendEventCallback(_ ret: [String: Any?]) {
        if (self.callbackId != nil) {
            let pluginResult: CDVPluginResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: ret);

            pluginResult.setKeepCallbackAs(ret["type"] as! String != "exit");

            self.commandDelegate?.send(pluginResult, callbackId: self.callbackId);
        }
    }

 }

 extension DappBrowserPlugin : WKScriptMessageHandler {
     @objc func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {

        if (message.name != WebViewHandler.DAB_BRIDGE_NAME) {
            return;
        }

        var pluginResult: CDVPluginResult? = nil;

        if(message.body is [String: Any]){
            let messageContent = message.body as! [String: Any];
            let scriptCallbackId = messageContent["id"] as! String;

            pluginResult = CDVPluginResult(status: CDVCommandStatus_OK, messageAs: []);
            if(messageContent["d"] != nil){
                let scriptResult = messageContent["d"] as! String;
                do {
                    let decodedResult = try JSONSerialization.jsonObject(with: scriptResult.data(using: .utf8)!, options:[]);
                    if (decodedResult is Array<Any>) {
                        pluginResult = CDVPluginResult(status: CDVCommandStatus_OK,
                                                       messageAs: decodedResult as? Array<Any>);
                    }
                }
                catch {
                    pluginResult = CDVPluginResult.init(status: CDVCommandStatus_JSON_EXCEPTION)
                }

             }

            self.commandDelegate.send(pluginResult, callbackId:scriptCallbackId);
        }
        else if(self.callbackId != nil){
             // Send a message event
            let messageContent = message.body as! String;
            do {
                let decodedResult = try JSONSerialization.jsonObject(with: messageContent.data(using: .utf8)!, options:[]);
                let dResult = ["type": WebViewHandler.MESSAGE_EVENT, "data": decodedResult];
                self.sendEventCallback(dResult);
            }
            catch let error {
                print("JSONSerialization.jsonObject error: \(error)");
            }
         }
     }
}

