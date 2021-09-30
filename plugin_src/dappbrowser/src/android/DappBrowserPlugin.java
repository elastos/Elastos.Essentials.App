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

package org.elastos.essentials.plugins.dappbrowser;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Looper;
import android.os.Parcelable;
import android.provider.Browser;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.Config;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaHttpAuthHandler;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.LOG;
import org.apache.cordova.PluginManager;
import org.apache.cordova.PluginResult;
import org.apache.cordova.CordovaPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;


@SuppressLint("SetJavaScriptEnabled")
public class DappBrowserPlugin extends CordovaPlugin {
    private static final String NULL = "null";
    protected static final String LOG_TAG = "DappBrowser";

    private static final String SELF = "_self";
    private static final String SYSTEM = "_system";

    private static final String EXIT_EVENT = "exit";
    private static final String LOAD_START_EVENT = "loadstart";
    private static final String LOAD_STOP_EVENT = "loadstop";
    private static final String LOAD_ERROR_EVENT = "loaderror";
    private static final String MESSAGE_EVENT = "message";

    private CallbackContext callbackContext;
    public WebViewHandler webViewHandler;
//    public int viewHeight;
    static DappBrowserPlugin instance = null;

    static DappBrowserPlugin getInstance() {
        return instance;
    }

    @Override
    public void pluginInitialize() {
//        viewHeight = ((ViewGroup)this.webView.getView()).getHeight();
        instance = this;
    }

    public boolean isMainThread() {
        return Looper.getMainLooper().getThread() == Thread.currentThread();
    }

    public void mainThreadExecute(String action, JSONArray args, CallbackContext callbackContext) {
        try {
            switch (action) {
                case "open":
                    this.open(args, callbackContext);
                    break;
                case "close":
                    this.close(args, callbackContext);
                    break;
                case "loadAfterBeforeload":
                    this.loadAfterBeforeload(args, callbackContext);
                    break;
                case "injectScriptCode":
                    this.injectScriptCode(args, callbackContext);
                    break;
                case "injectScriptFile":
                    this.injectScriptFile(args, callbackContext);
                    break;
                case "injectStyleCode":
                    this.injectStyleCode(args, callbackContext);
                    break;
                case "injectStyleFile":
                    this.injectStyleFile(args, callbackContext);
                    break;
                case "show":
                    this.show(callbackContext);
                    break;
                case "hide":
                    this.hide(callbackContext);
                    break;
                case "canGoBack":
                    this.canGoBack(callbackContext);
                    break;
                case "goBack":
                    this.goBack(callbackContext);
                    break;
                case "loadUrl":
                    this.loadUrl(args, callbackContext);
                    break;
                case "setTitle":
                    this.setTitle(args, callbackContext);
                    break;
                case "getWebViewShot":
                    this.getWebViewShot(callbackContext);
                    break;

                case "addEventListener":
                    this.addEventListener(callbackContext);
                    break;
                case "removeEventListener":
                    this.removeEventListener(callbackContext);
                    break;
            }
        } catch (Exception e) {
            e.printStackTrace();
            callbackContext.error(e.getLocalizedMessage());
        }
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        switch (action) {
            case "open":
            case "close":
            case "loadAfterBeforeload":
            case "injectScriptCode":
            case "injectScriptFile":
            case "injectStyleCode":
            case "injectStyleFile":
            case "show":
            case "hide":
            case "canGoBack":
            case "goBack":
            case "loadUrl":
            case "setTitle":
            case "getWebViewShot":
            case "addEventListener":
            case "removeEventListener":
                break;
            default:
                return false;
        }

        if (isMainThread()) {
            mainThreadExecute(action, args, callbackContext);
        }
        else {
            this.cordova.getActivity().runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    mainThreadExecute(action, args, callbackContext);
                }
            });
        }
        return true;
    }

    private void open(JSONArray args, CallbackContext callbackContext) throws Exception {
        final String url = args.getString(0);
        String t = args.optString(1);
        if (t == null || t.equals("") || t.equals(NULL)) {
            t = SELF;
        }
        final String target = t;
        final String options = args.optString(2);

        LOG.d(LOG_TAG, "target = " + target);

        String result = "";

        try {
            // SELF
            if (SELF.equals(target)) {
                LOG.d(LOG_TAG, "in self");
                result = openInCordovaWebView(url, options);
            }
            // SYSTEM
            else if (SYSTEM.equals(target)) {
                LOG.d(LOG_TAG, "in system");
                result = openInSystem(url);
            }
            // BLANK - or anything else
            else {
                LOG.d(LOG_TAG, "in blank or webview");
                result = openInDappBrowser(url, options, target);
            }

            PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, result);
            callbackContext.sendPluginResult(pluginResult);
        }
        catch (Exception e) {
            e.printStackTrace();
            callbackContext.error(e.getLocalizedMessage());
        }
    }

    private String openInDappBrowser(final String url, String options, String target) throws Exception {
        DappBrowserOptions browserOptions = DappBrowserOptions.parseOptions(options);
        this.webViewHandler = new WebViewHandler(this, url, browserOptions, target);

        return "";
    }

    private String openInSystem(final String url)  {
        try {
            Intent intent = null;
            intent = new Intent(Intent.ACTION_VIEW);
            // Omitting the MIME type for file: URLs causes "No Activity found to handle Intent".
            // Adding the MIME type to http: URLs causes them to not be handled by the downloader.
            Uri uri = Uri.parse(url);
            if ("file".equals(uri.getScheme())) {
                intent.setDataAndType(uri, webView.getResourceApi().getMimeType(uri));
            } else {
                intent.setData(uri);
            }
            intent.putExtra(Browser.EXTRA_APPLICATION_ID, cordova.getActivity().getPackageName());
            // CB-10795: Avoid circular loops by preventing it from opening in the current app
            this.openExternalExcludeCurrentApp(intent);
            return "";
            // not catching FileUriExposedException explicitly because buildtools<24 doesn't know about it
        } catch (java.lang.RuntimeException e) {
            LOG.d(LOG_TAG, "InAppBrowser: Error loading url "+url+":"+ e.toString());
            return e.toString();
        }
    }

    private String openInCordovaWebView(final String url, String options) throws Exception {
        LOG.d(LOG_TAG, "in self");
        String result = "";

        /* This code exists for compatibility between 3.x and 4.x versions of Cordova.
         * Previously the Config class had a static method, isUrlWhitelisted(). That
         * responsibility has been moved to the plugins, with an aggregating method in
         * PluginManager.
         */
        Boolean shouldAllowNavigation = null;
        if (url.startsWith("javascript:")) {
            shouldAllowNavigation = true;
        }
        if (shouldAllowNavigation == null) {
            try {
                Method iuw = Config.class.getMethod("isUrlWhiteListed", String.class);
                shouldAllowNavigation = (Boolean)iuw.invoke(null, url);
            } catch (NoSuchMethodException e) {
                LOG.d(LOG_TAG, e.getLocalizedMessage());
            } catch (IllegalAccessException e) {
                LOG.d(LOG_TAG, e.getLocalizedMessage());
            } catch (InvocationTargetException e) {
                LOG.d(LOG_TAG, e.getLocalizedMessage());
            }
        }
        if (shouldAllowNavigation == null) {
            try {
                Method gpm = webView.getClass().getMethod("getPluginManager");
                PluginManager pm = (PluginManager)gpm.invoke(webView);
                Method san = pm.getClass().getMethod("shouldAllowNavigation", String.class);
                shouldAllowNavigation = (Boolean)san.invoke(pm, url);
            } catch (NoSuchMethodException e) {
                LOG.d(LOG_TAG, e.getLocalizedMessage());
            } catch (IllegalAccessException e) {
                LOG.d(LOG_TAG, e.getLocalizedMessage());
            } catch (InvocationTargetException e) {
                LOG.d(LOG_TAG, e.getLocalizedMessage());
            }
        }
        // load in webview
        if (Boolean.TRUE.equals(shouldAllowNavigation)) {
            LOG.d(LOG_TAG, "loading in webview");
            webView.loadUrl(url);
        }
        //Load the dialer
        else if (url.startsWith(WebView.SCHEME_TEL))
        {
            try {
                LOG.d(LOG_TAG, "loading in dialer");
                Intent intent = new Intent(Intent.ACTION_DIAL);
                intent.setData(Uri.parse(url));
                cordova.getActivity().startActivity(intent);
            } catch (android.content.ActivityNotFoundException e) {
                LOG.e(LOG_TAG, "Error dialing " + url + ": " + e.toString());
            }
        }
        // load in InAppBrowser
        else {
            LOG.d(LOG_TAG, "loading in InAppBrowser");
            result = openInDappBrowser(url, options, "_blank");
        }
        return result;
    }

    private void close(JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (webViewHandler != null) {
            String mode = args.getString(0);
            if (mode.equals("null")) {
                mode = null;
            }
            webViewHandler.closeWithModeMainThread(mode, callbackContext);
        }
    }

    private void loadAfterBeforeload(JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (webViewHandler != null) {
            final String url = args.getString(0);
            webViewHandler.loadAfterBeforeload(url, callbackContext);
        }
    }

    private void injectScriptCode(JSONArray args, CallbackContext callbackContext) throws JSONException {
        String jsWrapper = null;
        if (args.getBoolean(1)) {
            jsWrapper = String.format("(function(){prompt(JSON.stringify([eval(%%s)]), 'gap-iab://%s')})()", callbackContext.getCallbackId());
        }
        injectDeferredObject(args.getString(0), jsWrapper);
    }

    private void injectScriptFile(JSONArray args, CallbackContext callbackContext) throws JSONException {
        String jsWrapper;
        if (args.getBoolean(1)) {
            jsWrapper = String.format("(function(d) { var c = d.createElement('script'); c.src = %%s; c.onload = function() { prompt('', 'gap-iab://%s'); }; d.body.appendChild(c); })(document)", callbackContext.getCallbackId());
        } else {
            jsWrapper = "(function(d) { var c = d.createElement('script'); c.src = %s; d.body.appendChild(c); })(document)";
        }
        injectDeferredObject(args.getString(0), jsWrapper);
    }

    private void injectStyleCode(JSONArray args, CallbackContext callbackContext) throws JSONException {
        String jsWrapper;
        if (args.getBoolean(1)) {
            jsWrapper = String.format("(function(d) { var c = d.createElement('style'); c.innerHTML = %%s; d.body.appendChild(c); prompt('', 'gap-iab://%s');})(document)", callbackContext.getCallbackId());
        } else {
            jsWrapper = "(function(d) { var c = d.createElement('style'); c.innerHTML = %s; d.body.appendChild(c); })(document)";
        }
        injectDeferredObject(args.getString(0), jsWrapper);
    }

    private void injectStyleFile(JSONArray args, CallbackContext callbackContext) throws JSONException {
        String jsWrapper;
        if (args.getBoolean(1)) {
            jsWrapper = String.format("(function(d) { var c = d.createElement('link'); c.rel='stylesheet'; c.type='text/css'; c.href = %%s; d.head.appendChild(c); prompt('', 'gap-iab://%s');})(document)", callbackContext.getCallbackId());
        } else {
            jsWrapper = "(function(d) { var c = d.createElement('link'); c.rel='stylesheet'; c.type='text/css'; c.href = %s; d.head.appendChild(c); })(document)";
        }
        injectDeferredObject(args.getString(0), jsWrapper);
    }

    private void show(CallbackContext callbackContext) {
        if (webViewHandler != null) {
            webViewHandler.show();
        }
        callbackContext.success();
    }

    private void hide(CallbackContext callbackContext) {
        if (webViewHandler != null) {
            webViewHandler.hide();
        }
        callbackContext.success();
    }

    private void loadUrl(JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (webViewHandler != null) {
            final String url = args.getString(0);
            webViewHandler.loadUrl(url);
        }
        callbackContext.success();
    }

    private void setTitle(JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (webViewHandler != null) {
            final String title = args.getString(0);
            webViewHandler.setTitle(title);
        }
        callbackContext.success();
    }

    private void canGoBack(CallbackContext callbackContext) {
        Boolean canGoBack = false;
        if (webViewHandler != null) {
            canGoBack = webViewHandler.canGoBack();
        }
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, canGoBack);
        callbackContext.sendPluginResult(pluginResult);
    }

    private void goBack(CallbackContext callbackContext) {
        if (webViewHandler != null) {
            webViewHandler.goBack();
        }
        callbackContext.success();
    }

    private void getWebViewShot(CallbackContext callbackContext) {
        String ret = "";
        if (webViewHandler != null) {
            ret = webViewHandler.getWebViewShot();
        }
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, ret);
        callbackContext.sendPluginResult(pluginResult);
    }

    private void addEventListener(CallbackContext callbackContext) {
        this.callbackContext = callbackContext;
        PluginResult pluginResult = new PluginResult(PluginResult.Status.NO_RESULT);
        pluginResult.setKeepCallback(true);
        callbackContext.sendPluginResult(pluginResult);
    }

    private void removeEventListener(CallbackContext callbackContext) {
        if (this.callbackContext != null) {
            PluginResult pluginResult = new PluginResult(PluginResult.Status.NO_RESULT);
            pluginResult.setKeepCallback(false);
            this.callbackContext.sendPluginResult(pluginResult);
            this.callbackContext = null;
        }

        callbackContext.success();
    }

    /**
     * Called when the view navigates.
     */
    @Override
    public void onReset() {
        // webViewHandler.close();
    }

    /**
     * Called when the system is about to start resuming a previous activity.
     */
    @Override
    public void onPause(boolean multitasking) {
        if (webViewHandler != null && webViewHandler.options.shouldPauseOnSuspend && webViewHandler.webView != null) {
            webViewHandler.webView.onPause();
        }
    }

    /**
     * Called when the activity will start interacting with the user.
     */
    @Override
    public void onResume(boolean multitasking) {
        if (webViewHandler != null && webViewHandler.options.shouldPauseOnSuspend && webViewHandler.webView != null) {
            webViewHandler.webView.onResume();
        }
    }

    /**
     * Called by AccelBroker when listener is to be shut down.
     * Stop listener.
     */
    public void onDestroy() {
        webViewHandler.close();
    }

    /**
     * Receive File Data from File Chooser
     *
     * @param requestCode the requested code from chromeclient
     * @param resultCode the result code returned from android system
     * @param intent the data from android file chooser
     */
    public void onActivityResult(int requestCode, int resultCode, Intent intent) {
        LOG.d(LOG_TAG, "onActivityResult");
        // If RequestCode or Callback is Invalid
        if(requestCode != WebViewHandler.FILECHOOSER_REQUESTCODE || webViewHandler.mUploadCallback == null) {
            super.onActivityResult(requestCode, resultCode, intent);
            return;
        }
        webViewHandler.mUploadCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, intent));
        webViewHandler.mUploadCallback = null;
    }
    /**
     * Inject an object (script or style) into the InAppBrowser WebView.
     *
     * This is a helper method for the inject{Script|Style}{Code|File} API calls, which
     * provides a consistent method for injecting JavaScript code into the document.
     *
     * If a wrapper string is supplied, then the source string will be JSON-encoded (adding
     * quotes) and wrapped using string formatting. (The wrapper string should have a single
     * '%s' marker)
     *
     * @param source      The source object (filename or script/style text) to inject into
     *                    the document.
     * @param jsWrapper   A JavaScript string to wrap the source string in, so that the object
     *                    is properly injected, or null if the source string is JavaScript text
     *                    which should be executed directly.
     */
    public void injectDeferredObject(String source, String jsWrapper) {
        if (webViewHandler != null && webViewHandler.webView != null) {
            String scriptToInject;
            if (jsWrapper != null) {
                org.json.JSONArray jsonEsc = new org.json.JSONArray();
                jsonEsc.put(source);
                String jsonRepr = jsonEsc.toString();
                String jsonSourceString = jsonRepr.substring(1, jsonRepr.length()-1);
                scriptToInject = String.format(jsWrapper, jsonSourceString);
            } else {
                scriptToInject = source;
            }
            final String finalScriptToInject = scriptToInject;
            this.cordova.getActivity().runOnUiThread(new Runnable() {
                @SuppressLint("NewApi")
                @Override
                public void run() {
                    webViewHandler.webView.evaluateJavascript(finalScriptToInject, null);
                }
            });
        } else {
            LOG.d(LOG_TAG, "Can't inject code into the system browser");
        }
    }



    /**
     * Display a new browser with the specified URL.
     *
     * @param url the url to load.
     * @return "" if ok, or error message.
     */
    public String openExternal(String url) {
        try {
            Intent intent = null;
            intent = new Intent(Intent.ACTION_VIEW);
            // Omitting the MIME type for file: URLs causes "No Activity found to handle Intent".
            // Adding the MIME type to http: URLs causes them to not be handled by the downloader.
            Uri uri = Uri.parse(url);
            if ("file".equals(uri.getScheme())) {
                intent.setDataAndType(uri, webView.getResourceApi().getMimeType(uri));
            } else {
                intent.setData(uri);
            }
            intent.putExtra(Browser.EXTRA_APPLICATION_ID, cordova.getActivity().getPackageName());
            // CB-10795: Avoid circular loops by preventing it from opening in the current app
            this.openExternalExcludeCurrentApp(intent);
            return "";
            // not catching FileUriExposedException explicitly because buildtools<24 doesn't know about it
        } catch (java.lang.RuntimeException e) {
            LOG.d(LOG_TAG, "InAppBrowser: Error loading url "+url+":"+ e.toString());
            return e.toString();
        }
    }

    /**
     * Opens the intent, providing a chooser that excludes the current app to avoid
     * circular loops.
     */
    private void openExternalExcludeCurrentApp(Intent intent) {
        String currentPackage = cordova.getActivity().getPackageName();
        boolean hasCurrentPackage = false;

        PackageManager pm = cordova.getActivity().getPackageManager();
        List<ResolveInfo> activities = pm.queryIntentActivities(intent, 0);
        ArrayList<Intent> targetIntents = new ArrayList<Intent>();

        for (ResolveInfo ri : activities) {
            if (!currentPackage.equals(ri.activityInfo.packageName)) {
                Intent targetIntent = (Intent)intent.clone();
                targetIntent.setPackage(ri.activityInfo.packageName);
                targetIntents.add(targetIntent);
            }
            else {
                hasCurrentPackage = true;
            }
        }

        // If the current app package isn't a target for this URL, then use
        // the normal launch behavior
        if (hasCurrentPackage == false || targetIntents.size() == 0) {
            this.cordova.getActivity().startActivity(intent);
        }
        // If there's only one possible intent, launch it directly
        else if (targetIntents.size() == 1) {
            this.cordova.getActivity().startActivity(targetIntents.get(0));
        }
        // Otherwise, show a custom chooser without the current app listed
        else if (targetIntents.size() > 0) {
            Intent chooser = Intent.createChooser(targetIntents.remove(targetIntents.size()-1), null);
            chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, targetIntents.toArray(new Parcelable[] {}));
            this.cordova.getActivity().startActivity(chooser);
        }
    }

    /**
     * Create a new plugin success result and send it back to JavaScript
     *
     * @param obj a JSONObject contain event payload information
     */
    public void sendEventCallback(JSONObject obj, boolean keepCallback) {
        sendEventCallback(obj, keepCallback, PluginResult.Status.OK);
    }

    /**
     * Create a new plugin result and send it back to JavaScript
     *
     * @param obj a JSONObject contain event payload information
     * @param status the status code to return to the JavaScript environment
     */
    public void sendEventCallback(JSONObject obj, boolean keepCallback, PluginResult.Status status) {
        if (callbackContext != null) {
            PluginResult result = new PluginResult(status, obj);
            result.setKeepCallback(keepCallback);
            callbackContext.sendPluginResult(result);
            if (!keepCallback) {
                callbackContext = null;
            }
        }
    }

    public CordovaPreferences getPreferences() {
        return this.preferences;
    }

    public WebView getWebView() {
        if (webViewHandler != null) {
            return  webViewHandler.webView;
        }
        else {
            return null;
        }
    }
}
