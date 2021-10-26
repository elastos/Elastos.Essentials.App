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

@objc(DappBrowserOptions)
class DappBrowserOptions: NSObject {

    @objc public var toolbar = true;
    @objc public var titlebarheight = 0;
    @objc public var progressbar = true;
    @objc public var loadurl = true;
    @objc public var backgroundcolor = "#FFFFFF";

    @objc public var cleardata = false;
    @objc public var clearcache = false;
    @objc public var clearsessioncache = false;
    @objc public var hidespinner = false;

    @objc public var enableviewportscale = false;
    @objc public var mediaplaybackrequiresuseraction = false;
    @objc public var allowinlinemediaplayback = false;
    @objc public var hidden = false;
    @objc public var disallowoverscroll = false;
    @objc public var hidenavigationbuttons = false;
    @objc public var lefttoright = false;
    @objc public var beforeload = "";
    @objc public var atdocumentstartscript = "";

    static func parseOptions(_ options: String?) throws -> DappBrowserOptions {
        let obj = DappBrowserOptions();

        if (options != nil && options != "") {
            let data = options!.data(using: String.Encoding.utf8);
            let json = try JSONSerialization.jsonObject(with: data!,
                                                                options: []) as! [String: Any];

            let fields = Mirror(reflecting: obj).children
            for (key, value) in fields {
                guard let key = key else { continue }
                
                if (json[key] != nil) {
                    if (value is Bool) {
                        obj.setValue(json[key] as! Bool, forKey: key);
                    }
                    else if (value is Int) {
                        obj.setValue(json[key] as! Int, forKey: key);
                    }
                    else if (value is String) {
                        obj.setValue(json[key] as! String, forKey: key);
                    }
                }
            }
        }

        return obj;
    }

}
