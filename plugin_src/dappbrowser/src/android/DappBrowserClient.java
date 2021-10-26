package org.elastos.essentials.plugins.dappbrowser;

import android.annotation.TargetApi;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.HttpAuthHandler;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.ProgressBar;

import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

import org.apache.cordova.LOG;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.PluginResult;
import org.apache.cordova.PluginManager;
import org.apache.cordova.CordovaHttpAuthHandler;

public class DappBrowserClient extends WebViewClient {
    protected static final String LOG_TAG = "DappBrowserClient";

    private static final String LOAD_START_EVENT = "loadstart";
    private static final String LOAD_STOP_EVENT = "loadstop";
    private static final String LOAD_ERROR_EVENT = "loaderror";
    private static final String BEFORELOAD = "beforeload";

    CordovaWebView webView;
    String beforeload;
    boolean waitForBeforeload;
    ProgressBar progressBar;
    private Activity activity;
    private String[] allowedSchemes;
    private DappBrowserPlugin brwoserPlugin;
    private Boolean injected = false;
    public String originUrl;

    public DappBrowserClient(DappBrowserPlugin brwoserPlugin, ProgressBar progressBar, String beforeload) {
        this.webView = webView;
        this.beforeload = beforeload;
        this.waitForBeforeload = beforeload != null;
        this.brwoserPlugin = brwoserPlugin;
        this.activity = brwoserPlugin.cordova.getActivity();
        this.webView = brwoserPlugin.webView;
        this.progressBar = progressBar;
    }

    /**
     * Override the URL that should be loaded
     *
     * Legacy (deprecated in API 24)
     * For Android 6 and below.
     *
     * @param webView
     * @param url
     */
    @SuppressWarnings("deprecation")
    @Override
    public boolean shouldOverrideUrlLoading(WebView webView, String url) {
        return shouldOverrideUrlLoading(url, null);
    }

    /**
     * Override the URL that should be loaded
     *
     * New (added in API 24)
     * For Android 7 and above.
     *
     * @param webView
     * @param request
     */
    @TargetApi(Build.VERSION_CODES.N)
    @Override
    public boolean shouldOverrideUrlLoading(WebView webView, WebResourceRequest request) {
        return shouldOverrideUrlLoading(request.getUrl().toString(), request.getMethod());
    }

    /**
     * Override the URL that should be loaded
     *
     * This handles a small subset of all the URIs that would be encountered.
     *
     * @param url
     * @param method
     */
    public boolean shouldOverrideUrlLoading(String url, String method) {
        boolean override = false;
        boolean useBeforeload = false;
        String errorMessage = null;

        if (beforeload.equals("yes") && method == null) {
            useBeforeload = true;
        }
        else if(beforeload.equals("yes")
                //TODO handle POST requests then this condition can be removed:
                && !method.equals("POST"))
        {
            useBeforeload = true;
        }
        else if(beforeload.equals("get") && (method == null || method.equals("GET"))) {
            useBeforeload = true;
        }
        else if(beforeload.equals("post") && (method == null || method.equals("POST"))) {
            //TODO handle POST requests
            errorMessage = "beforeload doesn't yet support POST requests";
        }

        // On first URL change, initiate JS callback. Only after the beforeload event, continue.
        if (useBeforeload && this.waitForBeforeload) {
            if(sendBeforeLoad(url, method)) {
                return true;
            }
        }

        if(errorMessage != null) {
            try {
                LOG.e(LOG_TAG, errorMessage);
                JSONObject obj = new JSONObject();
                obj.put("type", LOAD_ERROR_EVENT);
                obj.put("url", url);
                obj.put("code", -1);
                obj.put("message", errorMessage);
                brwoserPlugin.sendEventCallback(obj, true, PluginResult.Status.ERROR);
            } catch(Exception e) {
                LOG.e(LOG_TAG, "Error sending loaderror for " + url + ": " + e.toString());
            }
        }

        if (url.startsWith(WebView.SCHEME_TEL)) {
            try {
                Intent intent = new Intent(Intent.ACTION_DIAL);
                intent.setData(Uri.parse(url));
                this.activity.startActivity(intent);
                override = true;
            } catch (android.content.ActivityNotFoundException e) {
                LOG.e(LOG_TAG, "Error dialing " + url + ": " + e.toString());
            }
        }
        else if (url.startsWith("geo:") || url.startsWith(WebView.SCHEME_MAILTO) || url.startsWith("market:") || url.startsWith("intent:")) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setData(Uri.parse(url));
                this.activity.startActivity(intent);
                override = true;
            } catch (android.content.ActivityNotFoundException e) {
                LOG.e(LOG_TAG, "Error with " + url + ": " + e.toString());
            }
        }
        // If sms:5551212?body=This is the message
        else if (url.startsWith("sms:")) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW);

                // Get address
                String address = null;
                int parmIndex = url.indexOf('?');
                if (parmIndex == -1) {
                    address = url.substring(4);
                } else {
                    address = url.substring(4, parmIndex);

                    // If body, then set sms body
                    Uri uri = Uri.parse(url);
                    String query = uri.getQuery();
                    if (query != null) {
                        if (query.startsWith("body=")) {
                            intent.putExtra("sms_body", query.substring(5));
                        }
                    }
                }
                intent.setData(Uri.parse("sms:" + address));
                intent.putExtra("address", address);
                intent.setType("vnd.android-dir/mms-sms");
                this.activity.startActivity(intent);
                override = true;
            } catch (android.content.ActivityNotFoundException e) {
                LOG.e(LOG_TAG, "Error sending sms " + url + ":" + e.toString());
            }
        }
        // Test for whitelisted custom scheme names like mycoolapp:// or twitteroauthresponse:// (Twitter Oauth Response)
        else if (!url.startsWith("http:") && !url.startsWith("https:") && url.matches("^[A-Za-z0-9+.-]*://.*?$")) {
/** Don't check the allowed list */
//            if (allowedSchemes == null) {
//                String allowed = brwoserPlugin.getPreferences().getString("AllowedSchemes", null);
//                if(allowed != null) {
//                    allowedSchemes = allowed.split(",");
//                }
//            }
//            if (allowedSchemes != null) {
//                for (String scheme : allowedSchemes) {
//                    if (url.startsWith(scheme)) {

            //direct open in system browser
            brwoserPlugin.openExternal(url);

            try {

                JSONObject obj = new JSONObject();
                obj.put("type", "customscheme");
                obj.put("url", url);
                brwoserPlugin.sendEventCallback(obj, true);
                override = true;
            } catch (Exception ex) {
                LOG.e(LOG_TAG, "Custom Scheme URI passed in has caused a error.");
            }
//                    }
//                }
//            }
        }

        if (useBeforeload) {
            this.waitForBeforeload = true;
        }
        return override;
    }

    private boolean sendBeforeLoad(String url, String method) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("type", BEFORELOAD);
            obj.put("url", url);
            if(method != null) {
                obj.put("method", method);
            }
            brwoserPlugin.sendEventCallback(obj, true);
            return true;
        } catch (JSONException ex) {
            LOG.e(LOG_TAG, "URI passed in has caused a JSON error.");
        }
        return false;
    }

    /**
     * New (added in API 21)
     * For Android 5.0 and above.
     *
     * @param view
     * @param request
     */
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return shouldInterceptRequest(request.getUrl().toString(), super.shouldInterceptRequest(view, request), request.getMethod());
    }

    public WebResourceResponse shouldInterceptRequest(String url, WebResourceResponse response, String method) {
        return response;
    }

    /*
     * onPageStarted fires the LOAD_START_EVENT
     *
     * @param view
     * @param url
     * @param favicon
     */
    @Override
    public void onPageStarted(WebView view, String url, Bitmap favicon) {
        super.onPageStarted(view, url, favicon);

        injected = false;
        this.originUrl = url;

        String newloc = "";
        if (url.startsWith("http:") || url.startsWith("https:") || url.startsWith("file:")) {
            newloc = url;
        }
        else
        {
            // Assume that everything is HTTP at this point, because if we don't specify,
            // it really should be.  Complain loudly about this!!!
            LOG.e(LOG_TAG, "Possible Uncaught/Unknown URI");
            newloc = "http://" + url;
        }

        // Update the UI if we haven't already
        brwoserPlugin.webViewHandler.setUrlEditText(newloc);
        progressBar.setVisibility(View.VISIBLE);

        try {
            JSONObject obj = new JSONObject();
            obj.put("type", LOAD_START_EVENT);
            obj.put("url", newloc);
            brwoserPlugin.sendEventCallback(obj, true);
        } catch (JSONException ex) {
            LOG.e(LOG_TAG, "URI passed in has caused a JSON error.");
        }
   }

    public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);

        // Set the namespace for postMessage()
        brwoserPlugin.injectDeferredObject("window.webkit={messageHandlers:{essentialsExtractor:essentialsExtractor}}", null);

        // Get the head from html
        brwoserPlugin.injectDeferredObject("window.essentialsExtractor.processHTML((!document || !document.getElementsByTagName || document.getElementsByTagName('head').length == 0) ? '' : document.getElementsByTagName('head')[0].innerHTML)", null);

        // CB-10395 DappBrowser's WebView not storing cookies reliable to local device storage
        CookieManager.getInstance().flush();

        // https://issues.apache.org/jira/browse/CB-11248
        view.clearFocus();
        view.requestFocus();

        progressBar.setVisibility(View.GONE);

        try {
            JSONObject obj = new JSONObject();
            obj.put("type", LOAD_STOP_EVENT);
            obj.put("url", url);

            brwoserPlugin.sendEventCallback(obj, true);
        } catch (JSONException ex) {
            LOG.d(LOG_TAG, "Should never happen");
        }
    }

    public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
        super.onReceivedError(view, errorCode, description, failingUrl);

        try {
            JSONObject obj = new JSONObject();
            obj.put("type", LOAD_ERROR_EVENT);
            obj.put("url", failingUrl);
            obj.put("code", errorCode);
            obj.put("message", description);

            brwoserPlugin.sendEventCallback(obj, true, PluginResult.Status.ERROR);
        } catch (JSONException ex) {
            LOG.d(LOG_TAG, "Should never happen");
        }
    }

    @Override
    public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
        super.onReceivedSslError(view, handler, error);
        try {
            JSONObject obj = new JSONObject();
            obj.put("type", LOAD_ERROR_EVENT);
            obj.put("url", error.getUrl());
            obj.put("code", 0);
            obj.put("sslerror", error.getPrimaryError());
            String message;
            switch (error.getPrimaryError()) {
                case SslError.SSL_DATE_INVALID:
                    message = "The date of the certificate is invalid";
                    break;
                case SslError.SSL_EXPIRED:
                    message = "The certificate has expired";
                    break;
                case SslError.SSL_IDMISMATCH:
                    message = "Hostname mismatch";
                    break;
                default:
                case SslError.SSL_INVALID:
                    message = "A generic error occurred";
                    break;
                case SslError.SSL_NOTYETVALID:
                    message = "The certificate is not yet valid";
                    break;
                case SslError.SSL_UNTRUSTED:
                    message = "The certificate authority is not trusted";
                    break;
            }
            obj.put("message", message);

            brwoserPlugin.sendEventCallback(obj, true, PluginResult.Status.ERROR);
        } catch (JSONException ex) {
            LOG.d(LOG_TAG, "Should never happen");
        }
        handler.cancel();
    }

    /**
     * On received http auth request.
     */
    @Override
    public void onReceivedHttpAuthRequest(WebView view, HttpAuthHandler handler, String host, String realm) {

        // Check if there is some plugin which can resolve this auth challenge
        PluginManager pluginManager = null;
        try {
            Method gpm = webView.getClass().getMethod("getPluginManager");
            pluginManager = (PluginManager)gpm.invoke(webView);
        } catch (NoSuchMethodException e) {
            LOG.d(LOG_TAG, e.getLocalizedMessage());
        } catch (IllegalAccessException e) {
            LOG.d(LOG_TAG, e.getLocalizedMessage());
        } catch (InvocationTargetException e) {
            LOG.d(LOG_TAG, e.getLocalizedMessage());
        }

        if (pluginManager == null) {
            try {
                Field pmf = webView.getClass().getField("pluginManager");
                pluginManager = (PluginManager)pmf.get(webView);
            } catch (NoSuchFieldException e) {
                LOG.d(LOG_TAG, e.getLocalizedMessage());
            } catch (IllegalAccessException e) {
                LOG.d(LOG_TAG, e.getLocalizedMessage());
            }
        }

        if (pluginManager != null && pluginManager.onReceivedHttpAuthRequest(webView, new CordovaHttpAuthHandler(handler), host, realm)) {
            return;
        }

        // By default handle 401 like we'd normally do!
        super.onReceivedHttpAuthRequest(view, handler, host, realm);
    }

    public void onLoadResource (WebView view, String url) {
        if (!injected && !url.equals(this.originUrl)) {
            brwoserPlugin.injectDeferredObject(brwoserPlugin.webViewHandler.options.atdocumentstartscript, null);
            injected = true;
        }
    }
}
