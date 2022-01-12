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

import UIKit
import SwiftJWT

class WebViewHandler:  NSObject {

    static let LOAD_START_EVENT = "loadstart";
    static let LOAD_STOP_EVENT = "loadstop";
    static let LOAD_ERROR_EVENT = "loaderror";
    static let BEFORELOAD = "beforeload";

    static let MESSAGE_EVENT = "message";
    static let PROGRESS_EVENT = "progress";
    static let HEAD_EVENT = "head";
    static let URL_CHANGED_EVENT = "urlchanged";
    static let CUSTOM_SCHEME_EVENT = "customscheme";
    static let EXIT_EVENT = "exit";

    var webView: WKWebView!
    var progressView: UIProgressView!
    var spinner: UIActivityIndicatorView!

    var brwoserPlugin: DappBrowserPlugin;
    var alertTitle: String;

    var settings: [String : Any]!;
    var options: DappBrowserOptions!;
    var inputUrl: URL!;
    var currentURL: String?;
    private var customSchemeFilters: [String] = [String]();

    var waitForBeforeload = false;

    static let DAB_BRIDGE_NAME = "essentialsExtractor";

    init(_ brwoserPlugin: DappBrowserPlugin, _ url: String, _ options: DappBrowserOptions) {


        self.brwoserPlugin = brwoserPlugin;
        self.options = options;
        self.waitForBeforeload = options.beforeload != "";
        self.settings = brwoserPlugin.commandDelegate.settings as? [String : Any];
        self.alertTitle = Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as! String;

        super.init();
        
        let filters = self.settings["customschemefilters"] as? String;
        if (filters != nil) {
            let items = filters!.split(separator: " ");
            for item in items {
                customSchemeFilters.append(String(item))
            }
        }

        self.createWebView(brwoserPlugin.viewController.view);

        //Set Background Color
        self.webView.isOpaque = false
        self.webView.backgroundColor = UIColor.init(hex: options.backgroundcolor);

        if (options.hidden) {
            hide();
        }
        else {
            show();
        }

        if (options.loadurl) {
            loadUrl(url);
        }

    }

    func settingForKey(_ key: String) -> Any? {
        return settings[key.lowercased()];
    }

    func cleanData() {
        let dataStore = WKWebsiteDataStore.default();
        if (options.cleardata) {
            let dateFrom = Date.init(timeIntervalSince1970: 0);
            dataStore.removeData(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(), modifiedSince:dateFrom, completionHandler:{ [self]() in
                NSLog("Removed all WKWebView data");
                self.webView.configuration.processPool = WKProcessPool(); // create new process pool to flush all data
            });
        }

        var isAtLeastiOS11 = false;
        if #available(iOS 11.0, *) {
            isAtLeastiOS11 = true;
        }

        if (options.clearcache) {
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

        if (options.clearsessioncache) {
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
    }

    func createWebView(_ webContainer: UIView) {
        // We create the views in code for primarily for ease of upgrades and not requiring an external .xib to be included

        var webViewBounds = webContainer.bounds;
        let height = CGFloat(options.titlebarheight) + UIApplication.shared.statusBarFrame.size.height;
        webViewBounds.origin.y += height
        webViewBounds.size.height -= height;

        let configuration = WKWebViewConfiguration();

        var userAgent = configuration.applicationNameForUserAgent;
        if (self.settingForKey("OverrideUserAgent") == nil &&
                self.settingForKey("AppendUserAgent") != nil) {
            userAgent = String(format:"%@ %@", userAgent!, self.settingForKey("AppendUserAgent") as! String);
        }
        configuration.applicationNameForUserAgent = userAgent;
        configuration.userContentController = WKUserContentController();
        configuration.processPool = CDVWKProcessPoolFactory.shared().sharedProcessPool();
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true;

        configuration.userContentController.add(self, name:WebViewHandler.DAB_BRIDGE_NAME);
        configuration.userContentController.add(self, name:"windowOpen");

        //Inject the js script at document start
        let replaceWindownOpen = "window.open = function(url, target) {" +
                    "    let param = {" +
                    "        url: url," +
                    "        target: target," +
                    "    };" +
                    "    window.webkit.messageHandlers.windowOpen.postMessage(JSON.stringify(param));" +
                    "}; ";
        let atdocumentstartscript = replaceWindownOpen + options.atdocumentstartscript;

        let atDocumentStartScript = WKUserScript(source: atdocumentstartscript, injectionTime: WKUserScriptInjectionTime.atDocumentStart, forMainFrameOnly: true);

        configuration.userContentController.addUserScript(atDocumentStartScript);

        //WKWebView options
        configuration.allowsInlineMediaPlayback = options.allowinlinemediaplayback;
        if #available(iOS 10.0, *) {
            configuration.ignoresViewportScaleLimits = options.enableviewportscale;
            if(options.mediaplaybackrequiresuseraction){
                configuration.mediaTypesRequiringUserActionForPlayback = WKAudiovisualMediaTypes.all
            }
            else {
                configuration.mediaTypesRequiringUserActionForPlayback = [];
            }
        }
        else{ // iOS 9
            configuration.mediaPlaybackRequiresUserAction = options.mediaplaybackrequiresuseraction;
        }

        if #available(iOS 13.0, *) {
            let contentMode = self.settingForKey("PreferredContentMode") as? String;
            if (contentMode == "mobile") {
                configuration.defaultWebpagePreferences.preferredContentMode = .mobile;
            }
            else if (contentMode == "desktop") {
                configuration.defaultWebpagePreferences.preferredContentMode = .desktop;
            }
        }

        self.webView = WKWebView.init(frame: webViewBounds, configuration: configuration);
        if (self.webView == nil) {
            return;
        }

        cleanData();

        webContainer.addSubview(self.webView!)

        //Add self as an observer of estimatedProgress
        self.webView.addObserver(self, forKeyPath:"estimatedProgress", options:NSKeyValueObservingOptions.new, context:nil);

        self.webView.navigationDelegate = self;
        self.webView.uiDelegate = self;

        if (self.settingForKey("OverrideUserAgent") != nil) {
            self.webView.customUserAgent = self.settingForKey("OverrideUserAgent") as? String;
        }

        self.webView.clearsContextBeforeDrawing = true;
        self.webView.clipsToBounds = true;
        self.webView.contentMode = UIView.ContentMode.scaleToFill;
        self.webView.isMultipleTouchEnabled = true;
        self.webView.isOpaque = true;
        self.webView.isUserInteractionEnabled = true;
    //        self.automaticallyAdjustsScrollViewInsets = true ;
        self.webView.autoresizingMask = [UIView.AutoresizingMask.flexibleHeight, UIView.AutoresizingMask.flexibleWidth];
        self.webView.allowsLinkPreview = false;
        self.webView.allowsBackForwardNavigationGestures = false;

        if #available(iOS 11.0, *) {
            self.webView.scrollView.contentInsetAdjustmentBehavior = UIScrollView.ContentInsetAdjustmentBehavior.never;
        }

        self.spinner = UIActivityIndicatorView.init(style: UIActivityIndicatorView.Style.gray);
        self.spinner.alpha = 1.000;
        self.spinner.autoresizesSubviews = true;
        self.spinner.autoresizingMask = [.flexibleLeftMargin, .flexibleTopMargin, .flexibleBottomMargin, .flexibleRightMargin];
        self.spinner.clearsContextBeforeDrawing = false;
        self.spinner.clipsToBounds = false;
        self.spinner.contentMode =  UIView.ContentMode.scaleToFill;
        self.spinner.frame = CGRect(x: webViewBounds.width / 2 - 10, y: webViewBounds.height / 2 - 10, width: 20.0, height: 20.0);
        self.spinner.isHidden = false;
        self.spinner.hidesWhenStopped = true;
        self.spinner.isMultipleTouchEnabled = false;
        self.spinner.isOpaque = false;
        self.spinner.isUserInteractionEnabled = false;
        self.spinner.stopAnimating();
        webView.addSubview(self.spinner);

        let frame =  CGRect(x: 0, y: 0, width: webViewBounds.width, height: 4.0);
        self.progressView = UIProgressView.init(frame: frame)
        webView.addSubview(self.progressView)
    }

    @objc override func observeValue(forKeyPath keyPath: String?, of object: Any?, change:  [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if ((keyPath == "estimatedProgress") && (object as? NSObject == self.webView)) {
            self.progressView.alpha = 1.0;
            self.progressView.setProgress(Float(self.webView.estimatedProgress), animated: true);
            self.brwoserPlugin.sendEventCallback(["type":WebViewHandler.PROGRESS_EVENT, "data":Float(self.webView.estimatedProgress) * 100]);

            if(self.webView.estimatedProgress >= 1.0) {
                UIView.animate(withDuration: 0.3, delay:0.3, options:.curveEaseOut, animations:{() in
                                self.progressView.alpha = 0.0;}, completion:{ (finished) in self.progressView.setProgress(0.0, animated: false);
                });
            }
        }
        else {
            super.observeValue(forKeyPath: keyPath, of: object, change: change, context: context);
        }
    }


    public func navigate(to url: URL) {
        if (url.scheme == "file") {
            self.webView.loadFileURL(url, allowingReadAccessTo: url);
        }
        else {
            let request = URLRequest.init(url: url);
            self.webView.load(request);
        }
    }

    public func loadAfterBeforeload(_ urlStr: String) {
        if (self.options.beforeload == "") {
            NSLog("unexpected loadAfterBeforeload called without feature beforeload=get|post");
        }

        let url = URL.init(string: urlStr);
        if (url == nil) {
            NSLog("loadAfterBeforeload called with nil url, ignoring.");
            return;
        }

        self.waitForBeforeload = false;
        self.navigate(to: url!);
    }

    public func close(_ exitMode: String? = nil) {
        self.brwoserPlugin.sendEventCallback(["type":WebViewHandler.EXIT_EVENT, "mode":exitMode]);

        guard self.webView != nil else {
            return;
        }

        self.currentURL = nil;

        self.webView.configuration.userContentController.removeScriptMessageHandler(forName: WebViewHandler.DAB_BRIDGE_NAME);
    //        self.webView.configuration = nil;

        self.webView.stopLoading();
        self.webView.removeFromSuperview();
        self.webView.uiDelegate = nil;
        self.webView.navigationDelegate = nil;

        self.webView = nil;
        self.brwoserPlugin.webViewHandler = nil;
    }

    public func show() {
        webView.isHidden = false;
    }

    public func hide() {
        webView.isHidden = true;
    }

    public func loadUrl(_ url: String) {
        self.navigate(to: URL(string: url)!);
    }

    public func reload() {
        webView.reload();
    }

    public func goBack() {
        if (webView.canGoBack) {
            webView.goBack();
        }
    }

    public func canGoBack() -> Bool {
        return webView.canGoBack;
    }

    public func setUrlEditText(_ text: String) {
        self.brwoserPlugin.sendEventCallback(["type":WebViewHandler.URL_CHANGED_EVENT, "url":text]);
    }

    public func getWebViewShot() -> String {
        let renderer = UIGraphicsImageRenderer(bounds: webView.bounds)
        let image = renderer.image { rendererContext in webView.layer.render(in: rendererContext.cgContext) }
        let data = image.pngData();
        guard let encoded = data?.base64EncodedString() else { return "" };
        return "data:image/png;base64," + encoded;
    }

    public func setAlpha(_ alpha: CGFloat) {
        self.webView.alpha = alpha
    }
}

extension WebViewHandler: WKNavigationDelegate {
    
    func getHeadAndSendCallback() {
        webView.evaluateJavaScript("(!document || !document.getElementsByTagName || document.getElementsByTagName('head').length == 0) ? '' : document.getElementsByTagName('head')[0].innerHTML", completionHandler: { (value: Any!, error: Error!) -> Void in
            if error == nil {
                let html = value as? String
                self.brwoserPlugin.sendEventCallback(["type":WebViewHandler.HEAD_EVENT, "data":value]);
            }
        })
    }

    @objc func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {

        let url = webView.url!.absoluteString;
        self.brwoserPlugin.sendEventCallback(["type": WebViewHandler.LOAD_START_EVENT, "url":url as Any]);

        if(!self.options.hidespinner) {
            self.spinner.startAnimating();
        }
    }

    
    func isDefinedCustomScheme(_ scheme: String) -> Bool {
        for filter in customSchemeFilters {
            if (scheme.hasPrefix(filter)) {
                return true;
            }
        }

        return false;
    }
    
    @objc func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let url = navigationAction.request.url;
        let mainDocumentURL = navigationAction.request.mainDocumentURL;

        let isTopLevelNavigation = (url == mainDocumentURL);

        if (isTopLevelNavigation) {
            if (self.currentURL != url!.absoluteString) {
                self.currentURL = url!.absoluteString;
                self.setUrlEditText(url!.absoluteString);
            }
        }

        var shouldStart: Bool = true;
        var useBeforeLoad: Bool = false;
        let httpMethod = navigationAction.request.httpMethod;
        var errorMessage: String? = nil;

        let beforeload = self.options.beforeload;
        if(beforeload == "post"){
            //TODO handle POST requests by preserving POST data then remove this condition
            errorMessage = "beforeload doesn't yet support POST requests";
        }
        else if(isTopLevelNavigation && (beforeload == "yes"
            || (beforeload == "get" && httpMethod == "GET")
        // TODO comment in when POST requests are handled
        // || (_beforeload == "post" && [httpMethod == "POST")
        )){
            useBeforeLoad = true;
        }

        // When beforeload, on first URL change, initiate JS callback. Only after the beforeload event, continue.
        if (self.waitForBeforeload && useBeforeLoad) {
            self.brwoserPlugin.sendEventCallback(["type":WebViewHandler.BEFORELOAD, "url":url?.absoluteString as Any]);
            decisionHandler(WKNavigationActionPolicy.cancel);
            return;
        }

        if(errorMessage != nil){
            NSLog(errorMessage!);
            self.brwoserPlugin.sendEventCallback(["type":WebViewHandler.LOAD_ERROR_EVENT, "url":url?.absoluteString as Any, "code": "-1", "message": errorMessage as Any]);
        }

        //if is an app store, tel, sms, mailto or geo link, let the system handle it, otherwise it fails to load it
    //        let allowedSchemes = ["itms-appss", "itms-apps", "tel", "sms", "mailto", "geo"];
        let allowedSchemes = ["https", "http"];
        if (!allowedSchemes.contains(url!.scheme!)) {
            if (isDefinedCustomScheme(url!.scheme!)) {
                self.brwoserPlugin.sendEventCallback(
                    ["type":WebViewHandler.CUSTOM_SCHEME_EVENT, "url":url?.absoluteString as Any]);
            }
            else {
                webView.stopLoading();
                self.brwoserPlugin.openInSystem(url!);
            }
            shouldStart = false;
        }
        else if ((self.brwoserPlugin.callbackId != nil) && isTopLevelNavigation) {
            // Send a loadstart event for each top-level navigation (includes redirects).
        }

        if (useBeforeLoad) {
            self.waitForBeforeload = true;
        }

        if(shouldStart){
            // Fix GH-417 & GH-424: Handle non-default target attribute
            // Based on https://stackoverflow.com/a/25713070/777265
            if ((navigationAction.targetFrame == nil)){
                webView.load(navigationAction.request);
                decisionHandler(WKNavigationActionPolicy.cancel);
            }
            else{
                decisionHandler(WKNavigationActionPolicy.allow);
            }
        }
        else{
            decisionHandler(WKNavigationActionPolicy.cancel);
        }
    }

    func loadStop() {
        self.spinner.stopAnimating();

        self.getHeadAndSendCallback();

        self.brwoserPlugin.sendEventCallback(["type":WebViewHandler.LOAD_STOP_EVENT, "url":webView.url?.absoluteString as Any?]);
    }

    @objc func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // update url, stop spinner, update back/forward

        webView.scrollView.contentInset = .zero;

        self.loadStop();
    }

    @objc func webView(_ webView: WKWebView, failedNavigation delegateName: String, withError error: Error) {
        // log fail message, stop spinner, update back/forward
        NSLog("webView:%@: %@", delegateName, error.localizedDescription);

        self.brwoserPlugin.sendEventCallback(["type":WebViewHandler.LOAD_ERROR_EVENT, "url":webView.url?.absoluteString as Any?, "message": error.localizedDescription]);

        self.loadStop();
    }

    @objc func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        self.webView(webView, failedNavigation: "didFailNavigation", withError: error);
    }

    @objc func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        self.webView(webView, failedNavigation: "didFailProvisionalNavigation", withError: error);
    }

//This for: Accept invalid or self-signed SSL certificates during EE development
//Need add "DEBUG" macro in XCode, "Build Settings"->"Active Compilation Conditions", Add "DEBUG" WITHOUT -D.
#if DEBUG
    @objc func webView(_ webView: WKWebView, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        completionHandler(URLSession.AuthChallengeDisposition.useCredential, URLCredential(trust:challenge.protectionSpace.serverTrust!))
    }
#endif
}

extension WebViewHandler: WKUIDelegate {

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {

        func okHandler(alerAction:UIAlertAction) {
            completionHandler();
        }

        self.alertDialog(self.alertTitle, message, okHandler);
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {

        func okHandler(alerAction:UIAlertAction) {
            completionHandler(true);
        }

        func cancelHandler(alerAction:UIAlertAction) {
            completionHandler(false);
        }

        self.alertDialog(self.alertTitle, message, okHandler, needCancel: true, cancelHandler);
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {

        let alertController = UIAlertController(title: self.alertTitle,
                                                message: prompt,
                                                preferredStyle: UIAlertController.Style.alert)

        let okAlertAction = UIAlertAction(title: "ok".localized, style: UIAlertAction.Style.default, handler: {_ in
                completionHandler(alertController.textFields![0].text);
            });
        alertController.addAction(okAlertAction)

        let cancelAlertAction = UIAlertAction(title: "cancel".localized, style: UIAlertAction.Style.cancel,
            handler: {_ in
                completionHandler(nil);
            });
        alertController.addAction(cancelAlertAction)

        alertController.addTextField(configurationHandler: { textField in
            textField.text = defaultText;
        });

        DispatchQueue.main.async {
            self.getViewController().present(alertController, animated: true, completion: nil)
        }

    }

    func getViewController() -> UIViewController {
        return self.brwoserPlugin.viewController!;
    }

    func alertDialog(_ title: String, _ msg: String, _ okHandler: ((UIAlertAction) -> Void)? = nil,
                        needCancel cancel: Bool  = false, _ cancelHandler: ((UIAlertAction) -> Void)? = nil) {

        let alertController = UIAlertController(title: title,
                                                message: msg,
                                                preferredStyle: UIAlertController.Style.alert)

        let okAlertAction = UIAlertAction(title: "ok".localized, style: UIAlertAction.Style.default, handler: okHandler)
        alertController.addAction(okAlertAction);

        if (cancel) {
            let cancelAlertAction = UIAlertAction(title: "cancel".localized, style:
                                                    UIAlertAction.Style.cancel, handler: cancelHandler)
            alertController.addAction(cancelAlertAction)
        }

        DispatchQueue.main.async {
            self.getViewController().present(alertController, animated: true, completion: nil)
        }
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let frame = navigationAction.targetFrame,
            frame.isMainFrame {
            return nil
        }
        webView.load(navigationAction.request)
        return nil
    }

}

extension WebViewHandler : WKScriptMessageHandler {
    @objc func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {

        if (message.name == WebViewHandler.DAB_BRIDGE_NAME) {
            brwoserPlugin.sendMessageEvent(message);
        }
        else if (message.name == "windowOpen") {
            windowOpen(message);
        }
    }

    public func windowOpen(_ message: WKScriptMessage) {
        let messageContent = message.body as! String;
        do {
            let params = try JSONSerialization.jsonObject(with: messageContent.data(using: .utf8)!, options:[]) as! [String: Any];
            guard params["url"] != nil, let url = URL(string: params["url"] as! String) else {
                return;
            }


            if (params["target"] as? String == "_system") {
                brwoserPlugin.openInSystem(url);
            }
            else {
                navigate(to: url);
            }
        }
        catch let error {
            print("JSONSerialization.jsonObject error: \(error)");
        }
    }
}
