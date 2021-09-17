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

@objc(DappViewController)
class DappViewController : UIViewController {
    
    var modeExt: String? = nil;
    var userDefinedOrientation: UIInterfaceOrientation = .portrait

    @IBOutlet weak var titlebarContainer: UIView!
    @IBOutlet weak var webContainer: UIView!
    var titlebar: TitleBarView!
    var webView: WKWebView!
    var webOriginFrame: CGRect?;
    var webLayoutView: UIView?;

    var webViewHandler: WebViewHandler!

    @IBOutlet weak var titlebarHeightConstraint: NSLayoutConstraint!

    convenience init(_ webViewHandler: WebViewHandler) {
        self.init();

        // Apply theming for native popups
//        let darkMode = false;
//        UIStyling.prepare(useDarkMode: darkMode)

        self.webViewHandler = webViewHandler;
    }


    override func loadView() {
        super.loadView()
        if let nib = Bundle.main.loadNibNamed("DappViewController", owner: self),
            let nibView = nib.first as? UIView {
            view = nibView
        }

    }
    
    func addMatchParentConstraints(view: UIView, parent: UIView) {
        parent.addConstraint(NSLayoutConstraint(item: view, attribute: .top, relatedBy: .equal, toItem: parent, attribute: .top, multiplier: 1.0, constant: 0.0))
        parent.addConstraint(NSLayoutConstraint(item: view, attribute: .leading, relatedBy: .equal, toItem: parent, attribute: .leading, multiplier: 1.0, constant: 0.0))
        parent.addConstraint(NSLayoutConstraint(item: view, attribute: .bottom, relatedBy: .equal, toItem: parent, attribute: .bottom, multiplier: 1.0, constant: 0.0))
        parent.addConstraint(NSLayoutConstraint(item: view, attribute: .trailing, relatedBy: .equal, toItem: parent, attribute: .trailing, multiplier: 1.0, constant: 0.0))

        view.translatesAutoresizingMaskIntoConstraints = false
    }

    override func viewDidLoad() {
        super.viewDidLoad();
        
        let a = self.view.frame;
        let b = self.webViewHandler.getViewController().view.frame;
        
        
        //Add titlebar
        titlebar = TitleBarView(titlebarContainer.frame, self)
        titlebarContainer.addSubview(titlebar!)
        self.addMatchParentConstraints(view: titlebar, parent: titlebarContainer)
        
        //Add webview
        let webView = self.webViewHandler.createViews(self.webContainer);
        if (webView != nil) {
            self.addMatchParentConstraints(view: webView!, parent: webContainer)
        }
    }

    public override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
    }

    private func updateStatusBarBackgroundColor(backgroundColor: String) {
        view.backgroundColor = UIColor.init(hex: backgroundColor)
    }

    public func setTitleBarVisibility(_ titleBarVisibility: TitleBarVisibility) {
        if titleBarVisibility == .visible {
            self.titlebarHeightConstraint.constant = 50.0
        }
        else {
            self.titlebarHeightConstraint.constant = 0.0
        }
    }
    
    public func close(_ exitMode: String? = nil) {
        self.webViewHandler.browserExit(exitMode);
        
        DispatchQueue.main.async {
            self.dismiss(animated: true, completion: nil)
        }
    }
 }
 
