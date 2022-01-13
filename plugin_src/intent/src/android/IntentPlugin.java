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

package org.elastos.essentials.plugins.intent;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import org.apache.cordova.*;
import org.json.JSONArray;
import org.json.JSONException;

public class IntentPlugin extends CordovaPlugin {
    private static final String LOG_TAG = "Intent";

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        try {
            switch (action) {
                case "sendIntent":
                    this.sendIntent(args, callbackContext);
                    break;
                case "sendUrlIntent":
                    this.sendUrlIntent(args, callbackContext);
                    break;
                case "addIntentListener":
                    this.addIntentListener(callbackContext);
                    break;
                case "sendIntentResponse":
                    this.sendIntentResponse(args, callbackContext);
                    break;

                default:
                    return false;
            }
        } catch (Exception e) {
            e.printStackTrace();
            callbackContext.error(e.getLocalizedMessage());
        }
        return true;
    }

    private void getIntentUri(Intent intent) {
        if (intent == null) {
            return;
        }

        String action = intent.getAction();
        if ((action != null) && action.equals("android.intent.action.VIEW")) {
            Uri uri = intent.getData();
            if (uri != null) {
                IntentManager.getShareInstance().setIntentUri(uri);
            }
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        getIntentUri(intent);
    }

    @Override
    protected void pluginInitialize() {
        Activity activity = cordova.getActivity();
        IntentManager.getShareInstance().setActivity(activity, preferences);
        getIntentUri(activity.getIntent());
        super.pluginInitialize();
    }

    protected void sendIntent(JSONArray args, CallbackContext callbackContext) throws Exception {
        String action = args.getString(0);
        String params = args.getString(1);

        IntentInfo info = new IntentInfo(action, params, callbackContext);
        IntentManager.getShareInstance().sendIntent(info);
        PluginResult pluginResult = new PluginResult(PluginResult.Status.NO_RESULT);
        pluginResult.setKeepCallback(true);
        callbackContext.sendPluginResult(pluginResult);
    }

    protected void sendUrlIntent(JSONArray args, CallbackContext callbackContext) throws Exception {
        String url = args.getString(0);

        if (IntentManager.getShareInstance().isInternalIntent(url)) {
            IntentManager.getShareInstance().receiveIntent(Uri.parse(url), callbackContext);
            PluginResult pluginResult = new PluginResult(PluginResult.Status.NO_RESULT);
            pluginResult.setKeepCallback(true);
            callbackContext.sendPluginResult(pluginResult);
        }
        else {
            IntentManager.getShareInstance().showWebPage(url);
            callbackContext.success();
        }
    }

    protected void sendIntentResponse(JSONArray args, CallbackContext callbackContext) throws Exception {
        String result = args.getString(0);
        long intentId = args.getLong(1);

        IntentManager.getShareInstance().sendIntentResponse(result, intentId);
        callbackContext.success();
    }

    protected void addIntentListener(CallbackContext callbackContext) throws Exception {
        PluginResult pluginResult = new PluginResult(PluginResult.Status.NO_RESULT);
        pluginResult.setKeepCallback(true);
        callbackContext.sendPluginResult(pluginResult);
        IntentManager.getShareInstance().setListenerReady(callbackContext);
    }
}
