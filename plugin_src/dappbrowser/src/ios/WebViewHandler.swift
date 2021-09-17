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

    var webView: WKWebView!
    var progressView: UIProgressView!
    var spinner: UIActivityIndicatorView!
    
    var brwoserPlugin: DappBrowserPlugin;
    var alertTitle: String;
    
    var settings: [String : Any]!;
    var browserOptions: DappBrowserOptions!;
    var inputUrl: URL!;
    var currentURL: URL?;
    
    var waitForBeforeload = false;
    
    static let DAB_BRIDGE_NAME = "essentials_dab";

    init(_ brwoserPlugin: DappBrowserPlugin) {
        self.brwoserPlugin = brwoserPlugin;
        self.alertTitle = Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as! String;
    }
    
    func setData(_ options: DappBrowserOptions, _ url: URL) {
        self.browserOptions = options;
        self.inputUrl = url;
        self.waitForBeforeload = browserOptions.beforeload != "";
        
        self.settings = brwoserPlugin.commandDelegate.settings as? [String : Any];
    }

    func settingForKey(_ key: String) -> Any? {
        return settings[key.lowercased()];
    }

    func createViews(_ webContainer: UIView) -> WKWebView? {
        // We create the views in code for primarily for ease of upgrades and not requiring an external .xib to be included

        var webViewBounds = webContainer.bounds;
//        let height = 50 + UIApplication.shared.statusBarFrame.size.height;
//        webViewBounds.origin.y += height
//        webViewBounds.size.height -= height;
        let userContentController = WKUserContentController();

        let configuration = WKWebViewConfiguration();

        var userAgent = configuration.applicationNameForUserAgent;
        if (self.settingForKey("OverrideUserAgent") == nil &&
                self.settingForKey("AppendUserAgent") != nil) {
            userAgent = String(format:"%@ %@", userAgent!, self.settingForKey("AppendUserAgent") as! String);
        }
        configuration.applicationNameForUserAgent = userAgent;
        configuration.userContentController = userContentController;
        configuration.processPool = CDVWKProcessPoolFactory.shared().sharedProcessPool();

        configuration.userContentController.add(self.brwoserPlugin, name:WebViewHandler.DAB_BRIDGE_NAME);

        //WKWebView options
        configuration.allowsInlineMediaPlayback = browserOptions.allowinlinemediaplayback;
        if #available(iOS 10.0, *) {
            configuration.ignoresViewportScaleLimits = browserOptions.enableviewportscale;
            if(browserOptions.mediaplaybackrequiresuseraction){
                configuration.mediaTypesRequiringUserActionForPlayback = WKAudiovisualMediaTypes.all
            }else{
                configuration.mediaTypesRequiringUserActionForPlayback = [];

            }
        }
        else{ // iOS 9
            configuration.mediaPlaybackRequiresUserAction = browserOptions.mediaplaybackrequiresuseraction;
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
            return nil;
        }
        
        webContainer.addSubview(self.webView!)
//        webContainer.sendSubviewToBack(self.webView);

        //Add self as an observer of estimatedProgress
        self.webView.addObserver(self, forKeyPath:"estimatedProgress", options:NSKeyValueObservingOptions.new, context:nil);


        self.webView.navigationDelegate = self;
        self.webView.uiDelegate = self;
        self.webView.backgroundColor = UIColor.white;

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
        self.spinner.frame = CGRect(x: self.webView.frame.midX, y: self.webView.frame.midY, width: 20.0, height: 20.0);
        self.spinner.isHidden = false;
        self.spinner.hidesWhenStopped = true;
        self.spinner.isMultipleTouchEnabled = false;
        self.spinner.isOpaque = false;
        self.spinner.isUserInteractionEnabled = false;
        webView.addSubview(self.spinner)
//        self.spinner.stopAnimating();
        
        let frame =  CGRect(x: 0, y: 0, width: webViewBounds.width, height: 4.0);
        self.progressView = UIProgressView.init(frame: frame)
        webView.addSubview(self.progressView)
        
        self.navigate(to: self.inputUrl);
        
        return self.webView;
    }

    @objc override func observeValue(forKeyPath keyPath: String?, of object: Any?, change:  [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if ((keyPath == "estimatedProgress") && (object as? NSObject == self.webView)) {
            self.progressView.alpha = 1.0;
            self.progressView.setProgress(Float(self.webView.estimatedProgress), animated: true);

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

    public func browserExit(_ exitMode: String? = nil) {
        self.brwoserPlugin.sendEventCallback(["type":"exit", "mode":exitMode]);

        guard self.webView != nil else {
            return;
        }

        self.webView.configuration.userContentController.removeScriptMessageHandler(forName: WebViewHandler.DAB_BRIDGE_NAME);
//        self.webView.configuration = nil;

        self.webView.stopLoading();
        self.webView.removeFromSuperview();
        self.webView.uiDelegate = nil;
        self.webView.navigationDelegate = nil;
        self.webView = nil;

//        // Set tmpWindow to hidden to make main webview responsive to touch again
//        // Based on https://stackoverflow.com/questions/4544489/how-to-remove-a-uiwindow
//        self->tmpWindow.hidden = YES;
//        self->tmpWindow = nil;

//        if (IsAtLeastiOSVersion(@"7.0")) {
//            if (_previousStatusBarStyle != -1) {
//                [[UIApplication sharedApplication] setStatusBarStyle:_previousStatusBarStyle];
//
//            }
//        }
//
//        _previousStatusBarStyle = -1; // this value was reset before reapplying it. caused statusbar to stay black on ios7
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
        if (self.browserOptions.beforeload == "") {
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

    public func close() {
        self.currentURL = nil;
        self.webView.removeFromSuperview();
        self.webView = nil;
        self.browserExit();
    }

 }

extension WebViewHandler: WKNavigationDelegate {

    @objc func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {

        // loading url, start spinner, update back/forward

//        NSLog(self.browserOptions.hidespinner ? @"Yes" : @"No");
        if(!self.browserOptions.hidespinner) {
            self.spinner.startAnimating();
        }
    }
    
    @objc func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let url = navigationAction.request.url;
        let mainDocumentURL = navigationAction.request.mainDocumentURL;

        let isTopLevelNavigation = (url == mainDocumentURL);

        if (isTopLevelNavigation) {
            self.currentURL = url;
            self.brwoserPlugin.setUrlEditText(url!.absoluteString);
        }

        var shouldStart: Bool = true;
        var useBeforeLoad: Bool = false;
        let httpMethod = navigationAction.request.httpMethod;
        var errorMessage: String? = nil;

        let beforeload = self.browserOptions.beforeload;
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
            self.brwoserPlugin.sendEventCallback(["type":"beforeload", "url":url?.absoluteString as Any]);
            decisionHandler(WKNavigationActionPolicy.cancel);
            return;
        }

        if(errorMessage != nil){
            NSLog(errorMessage!);
            self.brwoserPlugin.sendEventCallback(["type":"loaderror", "url":url?.absoluteString as Any, "code": "-1", "message": errorMessage as Any]);
        }

        //if is an app store, tel, sms, mailto or geo link, let the system handle it, otherwise it fails to load it
        let allowedSchemes = ["itms-appss", "itms-apps", "tel", "sms", "mailto", "geo"];
        if (allowedSchemes.contains(url!.scheme!)) {
            webView.stopLoading();
            self.brwoserPlugin.openInSystem(url!);
            shouldStart = false;
        }
        else if ((self.brwoserPlugin.callbackId != nil) && isTopLevelNavigation) {
            // Send a loadstart event for each top-level navigation (includes redirects).
            self.brwoserPlugin.sendEventCallback(["type":"loadstart", "url":url?.absoluteString as Any]);
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

    @objc func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // update url, stop spinner, update back/forward

        self.brwoserPlugin.setUrlEditText(self.currentURL!.absoluteString);
        webView.scrollView.contentInset = .zero;

        self.spinner.stopAnimating();
        
        self.brwoserPlugin.sendEventCallback(["type":"loadstop", "url":webView.url?.absoluteString as Any?]);
    }

    @objc func webView(_ webView: WKWebView, failedNavigation delegateName: String, withError error: Error) {
        // log fail message, stop spinner, update back/forward
        NSLog("webView:%@: %@", delegateName, error.localizedDescription);

        self.spinner.stopAnimating();

//        self.addressLabel.text = NSLocalizedString("Load Error", nil);
        
        self.brwoserPlugin.sendEventCallback(["type":"loaderror", "url":webView.url?.absoluteString as Any?, "message": error.localizedDescription]);
    }

    @objc func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        self.webView(webView, failedNavigation: "didFailNavigation", withError: error);
    }

    @objc func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        self.webView(webView, failedNavigation: "didFailProvisionalNavigation", withError: error);
    }
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

}
