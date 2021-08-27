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

package org.elastos.essentials.plugins.dappbrowser;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;
import org.apache.cordova.CordovaPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

public class TitleBarPlugin extends CordovaPlugin {

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        try {
            switch (action) {
                case "setTitle":
                    this.setTitle(args, callbackContext);
                    break;
                case "setBackgroundColor":
                    this.setBackgroundColor(args, callbackContext);
                    break;
                case "setForegroundMode":
                    this.setForegroundMode(args, callbackContext);
                    break;
                case "setNavigationMode":
                    this.setNavigationMode(args, callbackContext);
                    break;
                case "setNavigationIconVisibility":
                    this.setNavigationIconVisibility(args, callbackContext);
                    break;
                case "addOnItemClickedListener":
                    this.addOnItemClickedListener(args, callbackContext);
                    break;
                case "removeOnItemClickedListener":
                    this.removeOnItemClickedListener(args, callbackContext);
                    break;
                case "setIcon":
                    this.setIcon(args, callbackContext);
                    break;
                case "setBadgeCount":
                    this.setBadgeCount(args, callbackContext);
                    break;
                case "setupMenuItems":
                    this.setupMenuItems(args, callbackContext);
                    break;
                case "showActivityIndicator":
                    this.showActivityIndicator(args, callbackContext);
                    break;
                case "hideActivityIndicator":
                    this.hideActivityIndicator(args, callbackContext);
                    break;
                case "setVisibility":
                    this.setVisibility(args, callbackContext);
                    break;
                default:
                    return false;
            }
        }
        catch (Exception e) {
            callbackContext.error(e.getLocalizedMessage());
        }
        return true;
    }

    private void showActivityIndicator(JSONArray args, CallbackContext callbackContext) throws Exception {
        int activityIndicatoryType = args.getInt(0);
        String hintText = args.isNull(1) ? null : args.getString(1);

        cordova.getActivity().runOnUiThread(() -> {
            getToolBar().showActivityIndicator(TitleBarActivityType.fromId(activityIndicatoryType), hintText);
        });

        callbackContext.success();
    }

    private void hideActivityIndicator(JSONArray args, CallbackContext callbackContext) throws Exception {
        int activityIndicatoryType = args.getInt(0);
        cordova.getActivity().runOnUiThread(() -> {
            getToolBar().hideActivityIndicator(TitleBarActivityType.fromId(activityIndicatoryType));
        });

        callbackContext.success();
    }

    private void setVisibility(JSONArray args, CallbackContext callbackContext) throws Exception {
        int titleBarVisibilityInt = args.getInt(0);
        int nativeStatusBarVisibilityInt = args.getInt(1);

        cordova.getActivity().runOnUiThread(() -> {
            // Show/hide title bar
            getToolBar().changeVisibility(
                    TitleBarVisibility.fromId(titleBarVisibilityInt),
                    NativeStatusBarVisibility.fromId(nativeStatusBarVisibilityInt)
            );
        });

        callbackContext.success();
    }

    private void setTitle(JSONArray args, CallbackContext callbackContext) throws Exception {
        String title;
        if (args.isNull(0))
            title = null;
        else
            title = args.getString(0);

        cordova.getActivity().runOnUiThread(() -> {
            getToolBar().setTitle(title);
        });

        callbackContext.success();
    }

    private void setBackgroundColor(JSONArray args, CallbackContext callbackContext) throws Exception {
        String hexColor = args.getString(0);

        cordova.getActivity().runOnUiThread(() -> {
            if (getToolBar().setBackgroundColor(hexColor))
                callbackContext.success();
            else
                callbackContext.error("Invalid color " + hexColor);
        });
    }

    private void setForegroundMode(JSONArray args, CallbackContext callbackContext) throws Exception {
        int modeAsInt = args.getInt(0);

        cordova.getActivity().runOnUiThread(() -> {
            getToolBar().setForegroundMode(TitleBarForegroundMode.fromId(modeAsInt));
        });

        callbackContext.success();
    }

    private void setNavigationMode(JSONArray args, CallbackContext callbackContext) throws Exception {
        int modeAsInt = args.getInt(0);

        cordova.getActivity().runOnUiThread(() -> {
            getToolBar().setNavigationMode(TitleBarNavigationMode.fromId(modeAsInt));
        });

        callbackContext.success();
    }

    private void setNavigationIconVisibility(JSONArray args, CallbackContext callbackContext) throws Exception {
        boolean visible = args.getBoolean(0);

        cordova.getActivity().runOnUiThread(() -> {
            getToolBar().setNavigationIconVisibility(visible);
        });

        callbackContext.success();
    }

    private void addOnItemClickedListener(JSONArray args, CallbackContext callbackContext) throws Exception {
        String functionString = args.getString(0);
        getToolBar().addOnItemClickedListener(functionString, (menuItem)->{
            if (menuItem == null)
                return;

            try {
                PluginResult res = new PluginResult(PluginResult.Status.OK, menuItem.toJSONObject());
                res.setKeepCallback(true);
                callbackContext.sendPluginResult(res);
            }
            catch (JSONException e) {
                PluginResult res = new PluginResult(PluginResult.Status.ERROR, e.getLocalizedMessage());
                res.setKeepCallback(true);
                callbackContext.sendPluginResult(res);
            }
        });

        PluginResult result = new PluginResult(PluginResult.Status.NO_RESULT);
        result.setKeepCallback(true);
        callbackContext.sendPluginResult(result);
    }

    private void removeOnItemClickedListener(JSONArray args, CallbackContext callbackContext) throws Exception {
        String functionString = args.getString(0);
        getToolBar().removeOnItemClickedListener(functionString);

        callbackContext.success();
    }

    private void setIcon(JSONArray args, CallbackContext callbackContext) throws Exception {
        int iconSlotAsInt = args.getInt(0);
        JSONObject iconObj = args.isNull(1) ? null : args.getJSONObject(1);

        TitleBarIconSlot iconSlot = TitleBarIconSlot.fromId(iconSlotAsInt);
        TitleBarIcon icon = TitleBarIcon.fromJSONObject(iconObj);

        cordova.getActivity().runOnUiThread(() -> {
            getToolBar().setIcon(iconSlot, icon);
        });

        callbackContext.success();
    }

    private void setBadgeCount(JSONArray args, CallbackContext callbackContext) throws Exception {
        int iconSlotAsInt = args.getInt(0);
        int badgeValue = args.getInt(1);

        TitleBarIconSlot iconSlot = TitleBarIconSlot.fromId(iconSlotAsInt);

        cordova.getActivity().runOnUiThread(() -> {
            getToolBar().setBadgeCount(iconSlot, badgeValue);
        });

        callbackContext.success();
    }

    private void setupMenuItems(JSONArray args, CallbackContext callbackContext) throws Exception {
        JSONArray menuItemsJson = (args.isNull(0)? null : args.getJSONArray(0));

        ArrayList<TitleBarMenuItem> menuItems = new ArrayList<>();
        if (menuItemsJson != null) {
            for (int i = 0; i < menuItemsJson.length(); i++) {
                TitleBarMenuItem menuItem = TitleBarMenuItem.fromJSONObject(menuItemsJson.getJSONObject(i));
                if (menuItem != null)
                    menuItems.add(menuItem);
            }
        }

        cordova.getActivity().runOnUiThread(() -> {
            getToolBar().setupMenuItems(menuItems);
        });
    }

    private TitleBar getToolBar() {
        return null;
    }
}
