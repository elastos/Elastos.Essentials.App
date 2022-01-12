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
 import WebKit

 public func DictionarytoString(_ dict: [String: Any]?) -> String? {
     if (dict != nil) {
         let data = try? JSONSerialization.data(withJSONObject: dict, options: [])
         if let str = String(data: data!, encoding: String.Encoding.utf8) {
             // JSONSerialization espaces slashes... (bug since many years). ios13 has a fix, but only ios13.
             let fixedString = str.replacingOccurrences(of: "\\/", with: "/")
             return fixedString
         }
     }
     return nil;
 }

 func anyToString(_ value: Any) -> String {
     if (value is String) {
         return (value as! String);
     }
     else if (value is Bool) {
         return (value as! Bool).description;
     }
     else if (value is [Any]) {
         return (value as! [Any]).description
     }
     else if (value is [String: Any]) {
         return DictionarytoString(value as! [String: Any]) ?? "{}";
     }
     else if (value is Int) {
         return String(value as! Int)
     }
     else if (value is Double) {
         return String(value as! Double)
     }
     else if (value is NSNull) {
         return "null"
     }
     else {
         return "\(value)"
     }
 }

 public func anyToJsonFieldString(_ value: Any) -> String {
     if (JSONSerialization.isValidJSONObject(value)) {
         do {
             let data = try JSONSerialization.data(withJSONObject: value, options: [])
             return String(data:data, encoding: .utf8)!
         } catch (let e) {
             print(e.localizedDescription)
         }
     }
     return anyToString(value)
 }

 //----------------------------------------------------------------------
 // Extend String to be able to throw simple String Errors
 extension String: LocalizedError{

    public var errorDescription: String? { return self }

    func toDict() -> [String : Any]? {
        let data = self.data(using: String.Encoding.utf8)
        if let dict = try? JSONSerialization.jsonObject(with: data!, options: JSONSerialization.ReadingOptions.mutableContainers) as? [String : Any] {
            return dict
        }
        return nil
    }

    func encodingURL() -> String {
        return self.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed)!
    }

    func encodingQuery() -> String {
        return self.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!
    }

    /*
     * Considering that the current string is a string representation of a (invalid but common) JSON object such as:
     * {key:"value"}
     * This methods makes sure to quote all keys are quoted so a further conversion to a dictionary would always succeed.
     */
    func quotedJsonStringKeys() -> String {
        return self.replacingOccurrences(of: "(\\\"(.*?)\\\"|(\\w+))(\\s*:\\s*(\\\".*?\\\"|.))", with: "\"$2$3\"$4", options: .regularExpression)
    }

    func indexOf(_ sub:String, backwards:Bool = false) -> Int {
        var pos = -1
        if let range = range(of:sub, options: backwards ? .backwards : .literal ) {
            if !range.isEmpty {
                pos = self.distance(from:startIndex, to:range.lowerBound)
            }
        }
        return pos
    }

    func trim() -> String {
        return self.trimmingCharacters(in: CharacterSet.whitespaces)
    }

    func subString(to: Int) -> String {
        var to = to
        if to > self.count {
            to = self.count
        }
        return String(self.prefix(to))
    }

    func subString(from: Int) -> String {
        if from >= self.count {
            return ""
        }
        let startIndex = self.index(self.startIndex, offsetBy: from)
        let endIndex = self.endIndex
        return String(self[startIndex..<endIndex])
    }

    func subString(start: Int, end: Int) -> String {
        if start < end {
            let startIndex = self.index(self.startIndex, offsetBy: start)
            let endIndex = self.index(self.startIndex, offsetBy: end)

            return String(self[startIndex..<endIndex])
        }
        return ""
    }
 }

 extension URL {
    public var parametersFromQueryString : [String: String]? {
        guard let components = URLComponents(url: self, resolvingAgainstBaseURL: true),
              let queryItems = components.queryItems else { return nil }
        return queryItems.reduce(into: [String: String]()) { (result, item) in
            result[item.name] = item.value
        }
    }
 }
