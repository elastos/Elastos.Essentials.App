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

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.ProgressBar;

import org.json.JSONException;
import org.json.JSONObject;

import android.view.WindowManager.LayoutParams;

import org.apache.cordova.LOG;
import org.apache.cordova.CallbackContext;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;

public class WebViewHandler {
    protected static final String LOG_TAG = "WebViewHandler";

    private static final String MESSAGE_EVENT = "message";
    private static final String PROGRESS_EVENT = "progress";
    public static final String HEAD_EVENT = "head";
    private static final String URL_CHANGED_EVENT = "urlchanged";
    private static final String EXIT_EVENT = "exit";

    private static final String BROWSER_DATA_DIRNAME = "/browserdata/";
    private static final String APP_CACAHE_DIRNAME = "/webappcache";

    public WebView webView;
    public ProgressBar progressBar;
    public DappBrowserPlugin brwoserPlugin;
    DappBrowserOptions options;
    private Activity activity;
    String beforeload = "";
    public DappBrowserClient currentClient;

    public ValueCallback<Uri[]> mUploadCallback;
    public final static int FILECHOOSER_REQUESTCODE = 1;

    public WebViewHandler(DappBrowserPlugin brwoserPlugin, String url, DappBrowserOptions options) {
        this.brwoserPlugin = brwoserPlugin;
        this.activity = brwoserPlugin.cordova.getActivity();
        this.options = options;

        options.atdocumentstartscript += "window.open = function(url, target) {return window.essentialsExtractor.windowOpen(url, target);};";

        // clearWebViewCache(this.activity);
        createWebView();

        //Set Background Color
        webView.setBackgroundColor(Color.parseColor(options.backgroundcolor));

        if (options.hidden) {
            hide();
        }
        else {
            show();
        }

        if (options.loadurl) {
            loadUrl(url);
        }
    }

    public int pxToDp(int px) {
        DisplayMetrics displayMetrics = activity.getResources().getDisplayMetrics();
        int dp = Math.round(px / ((float)displayMetrics.densityDpi / DisplayMetrics.DENSITY_DEFAULT));
        return dp;
    }

    public int dpToPx(int dp) {
        DisplayMetrics displayMetrics = activity.getResources().getDisplayMetrics();
        int px = Math.round(dp * ((float)displayMetrics.densityDpi / DisplayMetrics.DENSITY_DEFAULT));
        return px;
    }

    public WebView createWebView() {
        int titlebarHeight = dpToPx(this.options.titlebarheight);
        LinearLayout.LayoutParams layoutParams = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT);
        layoutParams.height = brwoserPlugin.viewHeight - titlebarHeight;

        webView = new WebView(this.activity);
        webView.setLayoutParams(layoutParams);
        webView.setId(View.generateViewId());
        webView.setY(titlebarHeight);

        progressBar = new ProgressBar(activity,null, android.R.attr.progressBarStyleHorizontal);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 8);
        params.gravity = Gravity.TOP;
        progressBar.setLayoutParams(params);
        progressBar.setId(View.generateViewId());

        webView.addView(progressBar);

        // File Chooser Implemented ChromeClient
        webView.setWebChromeClient(new DappChromeClient(brwoserPlugin.webView) {
            public boolean onShowFileChooser (WebView webView, ValueCallback<Uri[]> filePathCallback, WebChromeClient.FileChooserParams fileChooserParams)
            {
                LOG.d(LOG_TAG, "File Chooser 5.0+");
                // If callback exists, finish it.
                if(mUploadCallback != null) {
                    mUploadCallback.onReceiveValue(null);
                }
                mUploadCallback = filePathCallback;

                // Create File Chooser Intent
                Intent content = new Intent(Intent.ACTION_GET_CONTENT);
                content.addCategory(Intent.CATEGORY_OPENABLE);
                content.setType("*/*");

                // Run cordova startActivityForResult
                brwoserPlugin.cordova.startActivityForResult(brwoserPlugin, Intent.createChooser(content, "Select File"), FILECHOOSER_REQUESTCODE);
                return true;
            }
        });

        currentClient = new DappBrowserClient(brwoserPlugin, options.atdocumentstartscript, beforeload);
        webView.setWebViewClient(currentClient);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setBuiltInZoomControls(options.showZoomControls);
        settings.setPluginState(android.webkit.WebSettings.PluginState.ON);

        // Add postMessage interface
        class JsObject {
            @JavascriptInterface
            public void postMessage(String data) {
                try {
                    JSONObject obj = new JSONObject();
                    obj.put("type", MESSAGE_EVENT);
                    obj.put("data", new JSONObject(data));
                    brwoserPlugin.sendEventCallback(obj, true);
                } catch (JSONException ex) {
                    LOG.e(LOG_TAG, "data object passed to postMessage has caused a JSON error.");
                }
            }

            @JavascriptInterface
            @SuppressWarnings("unused")
            public void processHTML(String html) {
                try {
                    JSONObject obj = new JSONObject();
                    obj.put("type", HEAD_EVENT);
                    obj.put("data", html);
                    brwoserPlugin.sendEventCallback(obj, true);
                }
                catch (JSONException ex) {
                    LOG.d(LOG_TAG, "Should never happen");;
                }
            }

            @JavascriptInterface
            @SuppressWarnings("unused")
            public void windowOpen(String url, String target) {
                if (target != null && target.equals("_system")) {
                    brwoserPlugin.openExternal(url);
                }
                else {
                    if (brwoserPlugin.isMainThread()) {
                        navigate(url);
                    }
                    else {
                        activity.runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                navigate(url);
                            }
                        });
                    }
                }
            }
        }

        settings.setMediaPlaybackRequiresUserGesture(options.mediaPlaybackRequiresUserAction);
        webView.addJavascriptInterface(new JsObject(), "essentialsExtractor");

        String overrideUserAgent = brwoserPlugin.getPreferences().getString("OverrideUserAgent", null);
        String appendUserAgent = brwoserPlugin.getPreferences().getString("AppendUserAgent", null);

        if (overrideUserAgent != null) {
            settings.setUserAgentString(overrideUserAgent);
        }
        if (appendUserAgent != null) {
            settings.setUserAgentString(settings.getUserAgentString() + " " + appendUserAgent);
        }

        //Toggle whether this is enabled or not!
        Bundle appSettings = this.activity.getIntent().getExtras();
        boolean enableDatabase = appSettings == null ? true : appSettings.getBoolean("DappBrowserStorageEnabled", true);
        if (enableDatabase) {
            String databasePath = getDatabasePath();
            settings.setDatabasePath(databasePath);
            settings.setDatabaseEnabled(true);
        }
        settings.setDomStorageEnabled(true);

        // settings.setAppCacheEnabled(true);
        // String cachePath = getAppCachePath(activity);
        // settings.setAppCachePath(cachePath);

       if (options.clearcache) {
            CookieManager.getInstance().removeAllCookies(null);
       } else if (options.clearsessioncache) {
            CookieManager.getInstance().removeSessionCookies(null);
       }

        // Enable Thirdparty Cookies
       CookieManager.getInstance().setAcceptThirdPartyCookies(webView,true);

        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(options.useWideViewPort);
        //If open setSupportMultipleWindows, the shouldOverrideUrlLoading is not called
//        // Multiple Windows set to true to mitigate Chromium security bug.
//        //  See: https://bugs.chromium.org/p/chromium/issues/detail?id=1083819
//        settings.setSupportMultipleWindows(true);

        webView.requestFocus();
        webView.requestFocusFromTouch();

        ViewGroup viewGroup = (ViewGroup)brwoserPlugin.webView.getView();
        viewGroup.addView(webView);

        return webView;
    }

    public void loadAfterBeforeload(String url, CallbackContext callbackContext) {
        if (beforeload == null) {
            LOG.e(LOG_TAG, "unexpected loadAfterBeforeload called without feature beforeload=yes");
        }

        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O) {
            currentClient.waitForBeforeload = false;
            webView.setWebViewClient(currentClient);
        } else {
            ((DappBrowserClient)webView.getWebViewClient()).waitForBeforeload = false;
        }
        webView.loadUrl(url);
        callbackContext.success();
    }

    public void show() {
        webView.setVisibility(View.VISIBLE);
        //For onBackPressed work
        webView.requestFocus();
    }

    public void hide() {
        //For onBackPressed work
        brwoserPlugin.webView.getView().requestFocus();
        webView.setVisibility(View.GONE);
    }

    public void loadUrl(String url) {
        webView.loadUrl(url);
    }

    public void reload() {
        webView.reload();
    }

    public void closeWithMode(String mode, CallbackContext callbackContext) {
        hide();

        final WebView childView = webView;

        // The JS protects against multiple calls, so this should happen only when
        // closeDialog() is called by other native code.
        if (childView == null) {
            return;
        }

        childView.setWebViewClient(new WebViewClient() {
            // NB: wait for about:blank before dismissing
            public void onPageFinished(WebView view, String url) {
                webView.destroy();
                brwoserPlugin.webViewHandler = null;
                webView = null;
                currentClient = null;

                //For onBackPressed work
                brwoserPlugin.webView.getView().requestFocus();

                if (callbackContext != null) {
                    callbackContext.success();
                }
            }
        });
        // NB: From SDK 19: "If you call methods on WebView from any thread
        // other than your app's UI thread, it can cause unexpected results."
        // http://developer.android.com/guide/webapps/migrating.html#Threads
        childView.loadUrl("about:blank");

        try {
            JSONObject obj = new JSONObject();
            obj.put("type", EXIT_EVENT);
            if (mode != null) {
                obj.put("mode", mode);
            }
            brwoserPlugin.sendEventCallback(obj, false);
        } catch (JSONException ex) {
            LOG.d(LOG_TAG, "Should never happen");
        }
    }

    public void closeWithModeMainThread(String mode, CallbackContext callbackContext) {
        if (brwoserPlugin.isMainThread()) {
            closeWithMode(mode, callbackContext);
        }
        else {
            this.activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    closeWithMode(mode, callbackContext);
                }
            });
        }
    }

    public void close() {
        closeWithModeMainThread(null, null);
    }

    /**
     * Gt to the essentials launcher page
     *
     */
    public void goToLauncher() {
        closeWithModeMainThread("goToLauncher", null);
    }

    /**
     * Checks to see if it is possible to go back one page in history, then does so.
     */
    public void goBack() {
        if (this.webView.canGoBack()) {
            this.webView.goBack();
        }
    }

    /**
     * Can the web browser go back?
     * @return boolean
     */
    public boolean canGoBack() {
        return this.webView.canGoBack();
    }

    /**
     * Has the user set the hardware back button to go back
     * @return boolean
     */
    public boolean hardwareBack() {
        return options.hadwareBackButton;
    }
    /**
     * Checks to see if it is possible to go forward one page in history, then does so.
     */
    private void goForward() {
        if (this.webView.canGoForward()) {
            this.webView.goForward();
        }
    }

    /**
     * Navigate to the new page
     *
     * @param url to load
     */
    public void navigate(String url) {
        if (!url.startsWith("http") && !url.startsWith("file:")) {
            this.webView.loadUrl("http://" + url);
        } else {
            this.webView.loadUrl(url);
        }
        this.webView.requestFocus();
    }


    public void setUrlEditText(String text) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("type", URL_CHANGED_EVENT);
            obj.put("url", text);

            brwoserPlugin.sendEventCallback(obj, true);
        } catch (JSONException ex) {
            LOG.d(LOG_TAG, "Should never happen");
        }
    }

    public void setProgress(int progress) {
        if (progressBar != null) {
            progressBar.setProgress(progress, true);
        }

        try {
            JSONObject obj = new JSONObject();
            obj.put("type", PROGRESS_EVENT);
            obj.put("data", progress);

            brwoserPlugin.sendEventCallback(obj, true);
        } catch (JSONException ex) {
            LOG.d(LOG_TAG, "Should never happen");
        }
    }

    public String getWebViewShot() {
        View view = webView;
        if (view.getVisibility() == View.GONE) {
            return "";
        }

        Bitmap bitmap = Bitmap.createBitmap(view.getWidth(),
                view.getHeight(), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        view.draw(canvas);

        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, byteArrayOutputStream);
        byte[] byteArray = byteArrayOutputStream .toByteArray();
        String encoded = Base64.encodeToString(byteArray, Base64.NO_WRAP);

        return "data:image/png;base64," + encoded;
    }

    public void setAlpha(float alpha) {
        webView.setAlpha(alpha);
    }

    private String getDataPath() {
        String ret = activity.getFilesDir().toString() + BROWSER_DATA_DIRNAME + options.did + "/";
        return ret;
    }

    public static String getAppCachePath(Activity activity) {
        String dir = activity.getFilesDir().toString() + BROWSER_DATA_DIRNAME + "appcache";
        File dest = new File(dir);
        if (!dest.exists()) {
            dest.mkdirs();
        }
        return dir;
    }

    private String getDatabasePath() {
        String dir = getDataPath() + "database";
        File dest = new File(dir);
        if (!dest.exists()) {
            dest.mkdirs();
        }
        return dir;
    }

    public static void clearData(String url, CallbackContext callbackContext) {
        //Clear cookies
        CookieManager cm = CookieManager.getInstance();
        String cookies = cm.getCookie(url);
        if (cookies != null) {
            for (String cookie : cookies.split("; ")) {
                cm.setCookie(url, cookie.split("=")[0] + "=");
            }
        }

        Activity activity = DappBrowserPlugin.getInstance().cordova.getActivity();
        WebView webView = new WebView(activity);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setDomStorageEnabled(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String str = "<script>" +
                        "localStorage.clear();" +
                        "if (window.indexedDB.databases) {" +
                        "   window.indexedDB.databases().then((r) => {" +
                        "       for (var i = 0; i < r.length; i++) " +
                        "           window.indexedDB.deleteDatabase(r[i].name);" +
                        "   });" +
                        "}" +
                        "</script>";
                InputStream data = new ByteArrayInputStream(str.getBytes());
                WebResourceResponse response = new WebResourceResponse("text/html", "UTF-8", data);
                return response;
            }

             @Override
             public void onPageFinished(WebView view, String url) {
                 super.onPageFinished(view, url);
                 view.clearHistory();
                 if (callbackContext != null) {
                     callbackContext.success();
                 }
             }
        });

        webView.loadUrl(url);
    }

  // public void clearWebViewCache(Context context) {

    //     try {
    //         context.deleteDatabase("webview.db");
    //         context.deleteDatabase("webviewCache.db");
    //     } catch (Exception e) {
    //         e.printStackTrace();
    //     }

    //     File appCacheDir = new File(context.getFilesDir().getAbsolutePath()
    //             + APP_CACAHE_DIRNAME);

    //     File webviewCacheDir = new File(context.getCacheDir()
    //             .getAbsolutePath() + "/webviewCache");

    //     if (webviewCacheDir.exists()) {
    //         deleteFile(webviewCacheDir);
    //     }
    //     if (appCacheDir.exists()) {
    //         deleteFile(appCacheDir);
    //     }
    // }

    // private void deleteFile(File file) {

    //     if (file.exists()) {
    //         if (file.isFile()) {
    //             file.delete();
    //         } else if (file.isDirectory()) {
    //             File files[] = file.listFiles();
    //             for (int i = 0; i < files.length; i++) {
    //                 deleteFile(files[i]);
    //             }
    //         }
    //         file.delete();
    //     }
    // }

}
