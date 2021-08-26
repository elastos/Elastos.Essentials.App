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

@objc(TitleBarPlugin)
class TitleBarPlugin : CDVPlugin {
    func success(_ command: CDVInvokedUrlCommand) {
        let result = CDVPluginResult(status: CDVCommandStatus_OK)

        self.commandDelegate.send(result, callbackId: command.callbackId)
    }

    func error(_ command: CDVInvokedUrlCommand, _ retAsString: String) {
        let result = CDVPluginResult(status: CDVCommandStatus_ERROR,
                                     messageAs: retAsString);

        self.commandDelegate.send(result, callbackId: command.callbackId)
    }

    private func getTitleBar() -> TitleBarView? {
//        let viewController = AppManager.getShareInstance().getViewControllerById(self.getModeId());
//        // TODO: The webview can't be closed for now, so the viewController maybe is nil.
//        if (viewController == nil) {
            return nil;
//        }
//        return viewController!.getTitlebar();
    }

    @objc func showActivityIndicator(_ command: CDVInvokedUrlCommand) {
        let activityIndicatoryType = command.arguments[0] as! Int
        let hintText = (command.arguments.count >= 2 ? command.arguments[1] as? String : nil)// Optional hint text

        DispatchQueue.main.async {
            self.getTitleBar()?.showActivityIndicator(activityType: TitleBarActivityType.init(rawValue: activityIndicatoryType) ?? .OTHER, hintText: hintText)
        }

        self.success(command)
    }

    @objc func hideActivityIndicator(_ command: CDVInvokedUrlCommand) {
        let activityIndicatoryType = command.arguments[0] as! Int

        DispatchQueue.main.async {
            self.getTitleBar()?.hideActivityIndicator(activityType: TitleBarActivityType.init(rawValue: activityIndicatoryType) ?? .OTHER)
        }

        self.success(command)
    }

    @objc func setVisibility(_ command: CDVInvokedUrlCommand) {
        let titleBarVisibilityInt = command.arguments[0] as! Int
        let nativeStatusBarVisibilityInt = command.arguments[1] as! Int

        DispatchQueue.main.async {
                // Show/hide title bar
            self.getTitleBar()?.changeVisibility(
                titleBarVisibility: TitleBarVisibility.init(rawValue: titleBarVisibilityInt)!,
                nativeStatusBarVisibility: NativeStatusBarVisibility.init(rawValue: nativeStatusBarVisibilityInt)!
            )
        }

        self.success(command)
    }

    @objc func setTitle(_ command: CDVInvokedUrlCommand) {
        var title: String? = nil
        if command.arguments.count > 0 {
            title = command.arguments[0] as? String
        }

        getTitleBar()?.setTitle(title)

        self.success(command)
    }

    @objc func setBackgroundColor(_ command: CDVInvokedUrlCommand) {
        let hexColor = command.arguments[0] as? String ?? "#000000"

        if ((getTitleBar()?.setBackgroundColor(hexColor)) != nil) {
            self.success(command)
        } else {
            self.error(command, "Invalid color \(hexColor)")
        }
    }

    @objc func setForegroundMode(_ command: CDVInvokedUrlCommand) {
        let modeAsInt = command.arguments[0] as! Int

        getTitleBar()?.setForegroundMode(TitleBarForegroundMode(rawValue: modeAsInt) ?? .LIGHT)

        self.success(command)
    }

    @objc func setNavigationMode(_ command: CDVInvokedUrlCommand) {
        let modeAsInt = command.arguments[0] as! Int

//        getTitleBar()?.setNavigationMode(TitleBarNavigationMode(rawValue: modeAsInt) ?? .HOME)

        self.success(command)
    }


    @objc func setNavigationIconVisibility(_ command: CDVInvokedUrlCommand) {
        let visible = command.arguments[0] as? Bool ?? true

        getTitleBar()?.setNavigationIconVisibility(visible: visible)

        self.success(command)
    }

    @objc func addOnItemClickedListener(_ command: CDVInvokedUrlCommand) {
        let functionString = (command.arguments[0] as? String)!
        getTitleBar()?.addOnItemClickedListener(functionString: functionString) { selectedItem in
                // An item of the menu was clicked by the user
                let result = try! CDVPluginResult(status: CDVCommandStatus_OK, messageAs: selectedItem.toJSONObject() as? [AnyHashable : Any])
                result!.setKeepCallbackAs(true)
                self.commandDelegate.send(result, callbackId: command.callbackId)
        }

        let result = CDVPluginResult(status: CDVCommandStatus_NO_RESULT)
        result!.setKeepCallbackAs(true)
        self.commandDelegate.send(result, callbackId: command.callbackId)
    }

    @objc func removeOnItemClickedListener(_ command: CDVInvokedUrlCommand) {
        let functionString = (command.arguments[0] as? String)!
        getTitleBar()?.removeOnItemClickedListener(functionString: functionString)

        self.success(command)
    }

    @objc func setIcon(_ command: CDVInvokedUrlCommand) {
        let iconSlotAsInt = command.arguments[0] as? Int ?? TitleBarIconSlot.INNER_LEFT.rawValue
        let iconObj = command.arguments[1] as? NSDictionary

        guard let iconSlot = TitleBarIconSlot(rawValue: iconSlotAsInt) else {
            self.error(command, "Invalid icon slot value")
            return
        }

        let icon = TitleBarIcon.fromJSONObject(jsonObject: iconObj)

        getTitleBar()?.setIcon(iconSlot: iconSlot, icon: icon)

        self.success(command)
    }

    @objc func setBadgeCount(_ command: CDVInvokedUrlCommand) {
        let iconSlotAsInt = command.arguments[0] as? Int ?? TitleBarIconSlot.INNER_LEFT.rawValue
        let badgeValue = command.arguments[1] as? Int ?? 0

        guard let iconSlot = TitleBarIconSlot(rawValue: iconSlotAsInt) else {
            self.error(command, "Invalid icon slot value")
            return
        }

        getTitleBar()?.setBadgeCount(iconSlot: iconSlot, badgeCount: badgeValue)

        self.success(command)
    }

    @objc func setupMenuItems(_ command: CDVInvokedUrlCommand) {
        let menuItemsJson = command.arguments[0] as? [Dictionary<String, String>]

        // Convert plugin data to clean model
        var menuItems: [TitleBarMenuItem] = []
        if menuItemsJson != nil {
            for mi in menuItemsJson! {
                if let menuItem = TitleBarMenuItem.fromMenuItemJSONObject(jsonObject: mi as NSDictionary) {
                    menuItems.append(menuItem)
                }
            }
        }

        getTitleBar()?.setupMenuItems(menuItems: menuItems)

        self.success(command)
    }
}
