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

class DappBrowserOptions: NSObject {
    
    public var toolbar = true;
    public var cleardata = false;
    public var clearcache = false;
    public var clearsessioncache = false;
    public var hidespinner = false;

    public var enableviewportscale = false;
    public var mediaplaybackrequiresuseraction = false;
    public var allowinlinemediaplayback = false;
    public var hidden = false;
    public var disallowoverscroll = false;
    public var hidenavigationbuttons = false;
    public var closebuttoncolor: String? = nil;
    public var lefttoright = false;
    public var toolbarcolor: String? = nil;
    public var toolbartranslucent = true;
    public var beforeload = "";

    public var darkmode = false;
    public var title: String? = nil;
    
    
    static func parseOptions(_ options: String) throws -> DappBrowserOptions {
        let obj = DappBrowserOptions();
        
//        let data = options.data(using: String.Encoding.utf8);
//        let json = try JSONSerialization.jsonObject(with: data!,
//                                                            options: []) as! [String: Any];

        // NOTE: this parsing does not handle quotes within values
        let pairs = options.components(separatedBy: ",");

        // parse keys and values, set the properties
        for pair in pairs {
            let keyvalue = pair.components(separatedBy: "=");

            if (keyvalue.count == 2) {
                let key = keyvalue[0].lowercased();
                let value = keyvalue[1];
                let value_lc = value.lowercased();

                let isBoolean = value_lc == "yes" || value_lc == "no";
                
                let numberFormatter = NumberFormatter();
                numberFormatter.allowsFloats = true;
                let numberValue = numberFormatter.number(from: value_lc);
                let isNumber = numberValue != nil;

                // set the property according to the key name
                if (obj.responds(to: NSSelectorFromString(key))) {
                    if (isNumber) {
                        obj.setValue(numberValue, forKey: key);
                    }
                    else if (isBoolean) {
                        obj.setValue(value_lc == "yes", forKey:key);
                    }
                    else {
                        obj.setValue(value, forKey:key);
                    }
                }
            }
        }

        return obj;
    }

}
