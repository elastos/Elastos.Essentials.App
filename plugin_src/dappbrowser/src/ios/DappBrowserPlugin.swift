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
    private var _waitForBeforeload: Bool = false;
    private var _previousStatusBarStyle: NSInteger = -1;
    var webViewHandler: WebViewHandler!
//    var webContainer: UIView!

    static var instance: DappBrowserPlugin?;

    static let kDappBrowserTargetSelf = "_self"
    static let kDappBrowserTargetSystem = "_system"
    static let kDappBrowserTargetBlank = "_blank"


    static func getInstance() -> DappBrowserPlugin {
        return instance!;
    }

    override func pluginInitialize() {
        DappBrowserPlugin.instance = self;
        self.webViewHandler = WebViewHandler(self);
//        _callbackIdPattern = nil;
//        _exitMode = nil;
    }

    //---------------------------------------------------------
    func success(_ command: CDVInvokedUrlCommand) {
        let result = CDVPluginResult(status: CDVCommandStatus_OK)

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
        if (self.webViewHandler.webView == nil) {
            NSLog("IAB.close() called but it was already closed.");
            return;
        }

        // Things are cleaned up in browserExit.
        self.webViewHandler.close();
        self.success(command);
    }

    func isSystemUrl(_ url: URL) -> Bool
    {
        if (url.absoluteString == "itunes.apple.com") {
            return true;
        }

        return false;
    }

    @objc func open(_ command: CDVInvokedUrlCommand) {
        let url = command.arguments[0] as? String;
        var target = command.arguments[1] as? String ?? DappBrowserPlugin.kDappBrowserTargetSelf;
        let options = command.arguments[1] as? String ?? "";

        self.callbackId = command.callbackId;

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
                    } else { // _blank or anything else
                        try self.openInDappBrowser(url: absoluteUrl!, withOptions:options);
                    }
                } catch let error {
                    self.error(command, error.localizedDescription);
                }

                pluginResult = CDVPluginResult(status: CDVCommandStatus_OK);
            }
        }

        pluginResult!.setKeepCallbackAs(true);
        self.commandDelegate?.send(pluginResult, callbackId: command.callbackId)
    }

    func openInDappBrowser(url: URL, withOptions options: String) throws {
        let browserOptions = try DappBrowserOptions.parseOptions(options);

        let dataStore = WKWebsiteDataStore.default();
        if (browserOptions.cleardata) {
            let dateFrom = Date.init(timeIntervalSince1970: 0);
            dataStore.removeData(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(), modifiedSince:dateFrom, completionHandler:{() in
                NSLog("Removed all WKWebView data");
                self.webViewHandler.webView.configuration.processPool = WKProcessPool(); // create new process pool to flush all data
            });
        }

        var isAtLeastiOS11 = false;
        if #available(iOS 11.0, *) {
            isAtLeastiOS11 = true;
        }

        if (browserOptions.clearcache) {
            if(isAtLeastiOS11){
                // Deletes all cookies
                let cookieStore = dataStore.httpCookieStore;
                cookieStore.getAllCookies({(cookies) in
                    for cookie in cookies {
                        cookieStore.delete(cookie, completionHandler:nil);
                    }
                });
            }
            else{
                // https://stackoverflow.com/a/31803708/777265
                // Only deletes domain cookies (not session cookies)
                dataStore.fetchDataRecords(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
                    completionHandler:{(records) in
                        for record  in records {
                             let dataTypes = record.dataTypes;
                            if (dataTypes.contains(WKWebsiteDataTypeCookies)) {
                                WKWebsiteDataStore.default().removeData(ofTypes: record.dataTypes,
                                                                        for:[record],
                                       completionHandler:{() in});
                            }
                         }
                    });
            }
        }

        if (browserOptions.clearsessioncache) {
            if (isAtLeastiOS11) {
                // Deletes session cookies
                let cookieStore = dataStore.httpCookieStore;
                cookieStore.getAllCookies({(cookies) in
                    for cookie in cookies {
                        if(cookie.isSessionOnly){
                            cookieStore.delete(cookie, completionHandler:nil);
                        }
                    }
                });
            }
            else{
                NSLog("clearsessioncache not available below iOS 11.0");
            }
        }

        // use of beforeload event
//        _waitForBeforeload = browserOptions.beforeload != "";

        self.webViewHandler.setData(browserOptions, url);
//        if (self.webViewHandler.webView != nil) {
//            self.webViewHandler.createViews(self.viewController.view);
//        }

        if (!browserOptions.hidden) {
//            self.webViewHandler.webView.isHidden = false;
            self.show(nil, withNoAnimate:browserOptions.hidden);
        }
    }

    @objc func show(_ command: CDVInvokedUrlCommand) {
        if (self.webViewHandler.webView != nil) {
            self.webViewHandler.webView.isHidden = false;
        }
        self.success(command);
    }

    @objc func show(_ command: CDVInvokedUrlCommand?, withNoAnimate noAnimate: Bool) {

        var initHidden = false;
        if (command == nil && noAnimate == true){
            initHidden = true;
        }

//        if (self.dappViewController == nil) {
//            NSLog("Tried to show IAB after it was closed.");
//            return;
//        }
    }

    @objc func hide(_ command: CDVInvokedUrlCommand) {
        if (self.webViewHandler.webView != nil) {
            self.webViewHandler.webView.isHidden = true;
        }
        self.success(command);
//        self.show(command, withNoAnimate:false);

//        // Set tmpWindow to hidden to make main webview responsive to touch again
//        // https://stackoverflow.com/questions/4544489/how-to-remove-a-uiwindow
//        self->tmpWindow.hidden = YES;
//        self->tmpWindow = nil;

//        if (self.dappViewController == nil) {
//            NSLog("Tried to hide IAB after it was closed.");
//            return;
//        }
//        if (_previousStatusBarStyle == -1) {
//            NSLog("Tried to hide IAB while already hidden");
//            return;
//        }
//
//        _previousStatusBarStyle = UIApplication.shared.statusBarStyle;

        // Run later to avoid the "took a long time" log message.
//        DispatchQueue.main.async {
//            self.dappViewController.transitioningDelegate = SlideAnimator.getInstance();
//            self.dappViewController.dismiss(animated: true, completion: nil);
//        }
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
                let endIndex =  sourceArrayString!.index(sourceArrayString!.endIndex, offsetBy: -2)
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
        self.webViewHandler.webView.evaluateJavaScript(script, completionHandler: { (result, error) in
            if (error == nil) {
                if (result != nil) {
//                    print("evaluateJavaScript result : \(result)");
                }
            }
            else {
                NSLog("evaluateJavaScript error : %@ : %@", error!.localizedDescription, script);
            }
        });
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

    public func setUrlEditText(_ text: String) {
//        self.dappViewController.titlebar.txtUrl.text = text;
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
                let dResult = ["type": "message", "data": decodedResult];
                self.sendEventCallback(dResult);
            }
            catch let error {
                print("JSONSerialization.jsonObject error: \(error)");
            }
         }
     }
}

