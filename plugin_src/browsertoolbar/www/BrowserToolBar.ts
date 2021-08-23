/*
* Copyright (c) 2018 Elastos Foundation
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

let exec = cordova.exec;

class ToolBarManagerImpl implements BrowserToolBar.ToolBarManager {
    setTitle(title?: String) {
        let args = [];
        if (title)
            args[0] = title;

        exec(()=>{}, (err)=>{
            console.error("Error while calling BrowserToolBar.setTitle()", err);
        }, 'BrowserToolBar', 'setTitle', args);
    }

    setBackgroundColor(hexColor: String) {
        exec(()=>{}, (err)=>{
            console.error("Error while calling BrowserToolBar.setBackgroundColor()", err);
        }, 'BrowserToolBar', 'setBackgroundColor', [hexColor]);
    }

    setForegroundMode(mode: BrowserToolBar.TitleBarForegroundMode) {
        exec(()=>{}, (err)=>{
            console.error("Error while calling BrowserToolBar.setForegroundMode()", err);
        }, 'BrowserToolBar', 'setForegroundMode', [mode]);
    }

    setNavigationMode(navigationMode: BrowserToolBar.TitleBarNavigationMode) {
        exec(()=>{}, (err)=>{
            console.error("Error while calling BrowserToolBar.setNavigationMode()", err);
        }, 'BrowserToolBar', 'setNavigationMode', [navigationMode]);
    }

    setupMenuItems(menuItems: [BrowserToolBar.TitleBarMenuItem]) {
        exec(()=>{}, (err)=>{
            console.error("Error while calling BrowserToolBar.setupMenuItems()", err);
        }, 'BrowserToolBar', 'setupMenuItems', [menuItems]);
    }

    setNavigationIconVisibility(visible: boolean) {
        exec(()=>{}, (err)=>{
            console.error("Error while calling BrowserToolBar.setNavigationIconVisibility()", err);
        }, 'BrowserToolBar', 'setNavigationIconVisibility', [visible]);
    }

    addOnItemClickedListener(onItemClicked: (menuItem: BrowserToolBar.TitleBarIcon) => void) {
        exec((menuItem: BrowserToolBar.TitleBarIcon)=>{
            onItemClicked(menuItem);
        }, (err)=>{
            console.error("Error while calling BrowserToolBar.addOnItemClickedListener()", err);
        }, 'BrowserToolBar', 'addOnItemClickedListener', [onItemClicked.toString()]);
    }

    removeOnItemClickedListener(onItemClicked: (menuItem: BrowserToolBar.TitleBarIcon) => void) {
        exec(()=>{}, (err)=>{
            console.error("Error while calling BrowserToolBar.removeOnItemClickedListener()", err);
        }, 'BrowserToolBar', 'removeOnItemClickedListener', [onItemClicked.toString()]);
    }

    setIcon(iconSlot: BrowserToolBar.TitleBarIconSlot, icon: BrowserToolBar.TitleBarIcon) {
        exec(()=>{}, (err)=>{
            console.error("Error while calling BrowserToolBar.setIcon()", err);
        }, 'BrowserToolBar', 'setIcon', [iconSlot, icon]);
    }

    setBadgeCount(iconSlot: BrowserToolBar.TitleBarIconSlot, count: number) {
        exec(()=>{}, (err)=>{
            console.error("Error while calling BrowserToolBar.setBadgeCount()", err);
        }, 'BrowserToolBar', 'setBadgeCount', [iconSlot, count]);
    }

    showActivityIndicator(type: BrowserToolBar.TitleBarActivityType, hintText?: string) {
        exec(()=>{}, (err)=>{
            console.error("Error while calling BrowserToolBar.showActivityIndicator()", err);
        }, 'BrowserToolBar', 'showActivityIndicator', [type, hintText]);
    }

    hideActivityIndicator(type: BrowserToolBar.TitleBarActivityType) {
        exec(()=>{}, (err)=>{
            console.error("Error while calling BrowserToolBar.hideActivityIndicator()", err);
        }, 'BrowserToolBar', 'hideActivityIndicator', [type]);
    }

    setVisibility(titleBarVisibility: BrowserToolBar.TitleBarVisibility, statusBarVisibility: BrowserToolBar.NativeStatusBarVisibility) {
        exec(()=>{}, (err)=>{
            console.error("Error while calling BrowserToolBar.setVisibility()", err);
        }, 'BrowserToolBar', 'setVisibility', [titleBarVisibility, statusBarVisibility]);
    }

    // @deprecated
    setBehavior(behavior: BrowserToolBar.TitleBarBehavior) {
        // Doesn't do anything any more but keep this empty placeholder for old apps backward
        // compatibility for a while.
    }

    setDisplayMode(displayMode: BrowserToolBar.TitleBarDisplayMode) {
        exec(()=>{}, (err)=>{
            console.error("Error while calling BrowserToolBar.setDisplayMode()", err);
        }, 'BrowserToolBar', 'setDisplayMode', [displayMode]);
    }
}

export = new ToolBarManagerImpl();