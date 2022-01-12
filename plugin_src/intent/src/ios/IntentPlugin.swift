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

 @objc(IntentPlugin)
 class IntentPlugin : CDVPlugin {
    var callbackId: String? = nil;
    var msgListener: ((Int, String, String)->(Void))? = nil;
    var intentCallbackId: String? = nil;
    var intentListener:  ((String, String?, String, Int64)->(Void))? = nil;

    var isLauncher = false;
    var isChangeIconPath = false;

    override func pluginInitialize() {
        IntentManager.getShareInstance().setViewController(viewController as! CDVViewController, self.commandDelegate);
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

    func success(_ command: CDVInvokedUrlCommand, retAsDict: [String : Any]) {
        let result = CDVPluginResult(status: CDVCommandStatus_OK,
                                     messageAs: retAsDict);

        self.commandDelegate?.send(result, callbackId: command.callbackId)
    }

    func success(_ command: CDVInvokedUrlCommand, retAsArray: [String]) {
        let result = CDVPluginResult(status: CDVCommandStatus_OK,
                                     messageAs: retAsArray);

        self.commandDelegate?.send(result, callbackId: command.callbackId)
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


    @objc func sendIntent(_ command: CDVInvokedUrlCommand) {
        let action = command.arguments[0] as? String ?? "";
        let params = command.arguments[1] as? String ?? nil;

        let info = IntentInfo(action, params, command.callbackId);

        do {
            try IntentManager.getShareInstance().sendIntent(info);
            let result = CDVPluginResult(status: CDVCommandStatus_NO_RESULT);
            result?.setKeepCallbackAs(true);
            self.commandDelegate?.send(result, callbackId: command.callbackId)
        } catch let error {
            self.error(command, error.localizedDescription);
        }
    }

    @objc func sendUrlIntent(_ command: CDVInvokedUrlCommand) {
        let url = command.arguments[0] as? String ?? "";
        let uri = URL(string: url);
        if (uri == nil) {
            self.error(command, "Url is invalid!");
            return;
        }

        do {
            if (IntentManager.getShareInstance().isInternalIntent(url)) {
                try IntentManager.getShareInstance().receiveIntent(uri!, command.callbackId);
                let result = CDVPluginResult(status: CDVCommandStatus_NO_RESULT);
                result?.setKeepCallbackAs(true);
                self.commandDelegate?.send(result, callbackId: command.callbackId)
            }
            else {
                try IntentManager.getShareInstance().openUrl(url);
                self.success(command);
            }
        }
        catch let error {
            self.error(command, error.localizedDescription);
        }
    }

    @objc func sendIntentResponse(_ command: CDVInvokedUrlCommand) {
        let result = command.arguments[0] as? String ?? "";
        let intentId = command.arguments[1] as? Int64 ?? -1

        do {
            try IntentManager.getShareInstance().sendIntentResponse(result, intentId);
            self.success(command);
        } catch let error {
            self.error(command, error.localizedDescription);
        }
    }

    @objc func addIntentListener(_ command: CDVInvokedUrlCommand) {
        self.intentCallbackId = command.callbackId;
        // Don't return any result now
        let result = CDVPluginResult(status: CDVCommandStatus_NO_RESULT);
        result?.setKeepCallbackAs(true);
        self.commandDelegate?.send(result, callbackId: command.callbackId)
        try? IntentManager.getShareInstance().setListenerReady(command.callbackId);
    }
 }
