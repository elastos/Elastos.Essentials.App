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

 @objc(InternalPlugin)
 class InternalPlugin : CDVPlugin {
    func success(_ command: CDVInvokedUrlCommand) {
        let result = CDVPluginResult(status: CDVCommandStatus_OK)

        self.commandDelegate?.send(result, callbackId: command.callbackId)
    }

    func success(_ command: CDVInvokedUrlCommand, _ retAsString: String) {
        let result = CDVPluginResult(status: CDVCommandStatus_OK,
                                     messageAs: retAsString);

        self.commandDelegate?.send(result, callbackId: command.callbackId)
    }

    func error(_ command: CDVInvokedUrlCommand, _ retAsString: String) {
        let result = CDVPluginResult(status: CDVCommandStatus_ERROR,
                                     messageAs: retAsString);

        self.commandDelegate?.send(result, callbackId: command.callbackId)
    }

    //---------------------------------------------------------
    private func getStoreDataDir(_ didStoreId: String) -> String {
        return NSHomeDirectory() + "/Documents/data/did/" + didStoreId
    }

    @objc func getStoreDataPath(_ command: CDVInvokedUrlCommand) {
        let didStoreId = command.arguments[0] as? String ?? "";
        self.success(command, getStoreDataDir(didStoreId));
    }

    private func getDIDDir(_ did: String?) -> String? {
        guard did != nil else {
            return nil;
        }

        return did!.replacingOccurrences(of: ":", with: "_");
    }

    public func getDidStorageDir(_ didStoreId: String, _ didString: String) -> String {
        return getStoreDataDir(didStoreId) + "/dids/" + getDIDDir(didString)!;
    }

    @objc func getDidStoragePath(_ command: CDVInvokedUrlCommand) {
        let didStoreId = command.arguments[0] as? String ?? "";
        let didString = command.arguments[1] as? String ?? "";
        self.success(command, getDidStorageDir(didStoreId, didString));
    }

    private func moveFolder(_ fromPath: String, _ toPath: String) throws {
        let fileManager = FileManager.default;
        if !fileManager.fileExists(atPath: fromPath) {
            return;
        }

        var directoryExists = ObjCBool.init(false);
        let fileExists = fileManager.fileExists(atPath: toPath, isDirectory: &directoryExists);
        if (fileExists && directoryExists.boolValue) {
            return;
        }
        else if (fileExists) {
            try fileManager.removeItem(atPath: toPath);
        }

        try fileManager.createDirectory(atPath: toPath, withIntermediateDirectories: true, attributes: nil);

        let files = try? fileManager.contentsOfDirectory(atPath: fromPath)
        if (files != nil) {
            for file in files! {
                let from = fromPath + "/" + file;
                let to = toPath + "/" + file;
                //If toPath is subdir, don't move it
                if (from != toPath) {
                    try fileManager.moveItem(atPath: from, toPath: to);
                }
            }
        }
    }

    @objc func changeOldPath(_ command: CDVInvokedUrlCommand) {
        let didStoreId = command.arguments[0] as? String ?? "";
        let didString = command.arguments[1] as? String ?? "";

        do {
            //move wallet dir
            let oldPath = NSHomeDirectory() + "/Documents/spv/" + didString;
            let newPath = getDidStorageDir(didStoreId, didString);
            try moveFolder(oldPath, newPath);
            self.success(command);
        }
        catch let error {
            self.error(command, error.localizedDescription);
        }
    }
 }
