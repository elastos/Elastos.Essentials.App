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
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLConnection;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.cordova.LOG;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.PluginResult;
import org.apache.cordova.PluginManager;
import org.apache.cordova.CordovaHttpAuthHandler;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

public class DappBrowserClient extends WebViewClient {
    protected static final String LOG_TAG = "DappBrowserClient";

    private static final String LOAD_START_EVENT = "loadstart";
    private static final String LOAD_STOP_EVENT = "loadstop";
    private static final String LOAD_ERROR_EVENT = "loaderror";
    private static final String CUSTOM_SCHEME_EVENT = "customscheme";
    private static final String BEFORELOAD = "beforeload";

    CordovaWebView webView;
    String beforeload;
    boolean waitForBeforeload;
    private Activity activity;
    private DappBrowserPlugin brwoserPlugin;
    public String originUrl;
    public String redirectUrl;
    private String atDocumentStartScript;
    // private Boolean injected = false;

    private String[] customSchemeFilters;

    public DappBrowserClient(DappBrowserPlugin brwoserPlugin, String beforeload) {
        this.beforeload = beforeload;
        this.waitForBeforeload = beforeload != null;
        this.brwoserPlugin = brwoserPlugin;
        this.activity = brwoserPlugin.cordova.getActivity();
        this.webView = brwoserPlugin.webView;

        String filters = brwoserPlugin.getPreferences().getString("CustomSchemeFilters", "");
        customSchemeFilters = filters.split(" ");
    }

    public void setInjectedJavascript(String injectedJs) {
        this.atDocumentStartScript = injectedJs + "window.webkit={messageHandlers:{essentialsExtractor:essentialsExtractor}};"
                + "window.essentialsExtractor.processHTML((!document || !document.getElementsByTagName || document.getElementsByTagName('head').length == 0) ? '' : document.getElementsByTagName('head')[0].innerHTML);";
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
        LOG.d(LOG_TAG, "shouldOverrideUrlLoading:" + url);

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

        if (url.equals(redirectUrl)) {
            brwoserPlugin.webViewHandler.loadUrl(redirectUrl);
            redirectUrl = null;
            return false;
        }
        else if (url.startsWith(WebView.SCHEME_TEL)) {
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
        else if (isDefinedCustomScheme(url)) {
            try {
                JSONObject obj = new JSONObject();
                obj.put("type", CUSTOM_SCHEME_EVENT);
                obj.put("url", url);
                brwoserPlugin.sendEventCallback(obj, true);
                override = true;
            } catch (Exception ex) {
                LOG.e(LOG_TAG, "Custom Scheme URI passed in has caused a error.");
            }
        }
        // Test for whitelisted custom scheme names like mycoolapp:// or twitteroauthresponse:// (Twitter Oauth Response)
        else if (!url.startsWith("http:") && !url.startsWith("https:") /*&& url.matches("^[A-Za-z0-9+.-]*://.*?$")*/) {
            //direct open in system browser
            brwoserPlugin.openExternal(url);
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
        LOG.d(LOG_TAG, "in browser client. isMainFrame:" + request.isForMainFrame() +": " + request.getUrl());

//        //Check whether injected, if not will inject web3 provider
//        if (!injected) {
//            injectWeb3ProviderScript(request);
//        }
//
//        return shouldInterceptRequest(request.getUrl().toString(), super.shouldInterceptRequest(view, request), request.getMethod());

        String urlString = request.getUrl().toString();
        WebResourceResponse resourceResponse = null;

        if (request.isForMainFrame() || this.originUrl == null || urlString.equals(this.originUrl)) {
            try {
                URL url = new URL(urlString);
                HttpURLConnection connection = (HttpURLConnection)url.openConnection();

                // For connection don't follow the redirects, and the webview follow the redirects.
                // When the shouldOverrideUrlLoading is called, it must reload the redirect url.
                // If don't do that, the webview will direct load the redirect url,
                // and don't call the shouldInterceptRequest for the redirect url, can't inject the js.
                connection.setInstanceFollowRedirects(false);

                // Pass the web resource request headers to the url connection headers
                Map<String, String> requestHeaders = request.getRequestHeaders();
                requestHeaders.forEach(connection::setRequestProperty);

                int responseCode = connection.getResponseCode();
                redirectUrl = connection.getHeaderField("Location");
                if (responseCode >= 300 && responseCode <= 399) {
                    redirectUrl = connection.getHeaderField("Location");
                }
                else {
                    InputStream inputStream = connection.getInputStream();
                    inputStream = injectJSInHeadTag(inputStream);

                    if (inputStream != null) {
                        String encoding = connection.getHeaderField("encoding");
                        if (encoding == null) {
                            //TODO:: maybe try get charset from mimeType.
                            encoding = "UTF-8";
                        }

                        resourceResponse = new WebResourceResponse("text/html", encoding, inputStream);

                        //set headers
                        Map<String, String> responseHeaders = new HashMap<String, String>();
                        Map<String, List<String>> map = connection.getHeaderFields();
                        for (Map.Entry<String, List<String>> entry : map.entrySet()) {
                            responseHeaders.put(entry.getKey(), connection.getHeaderField(entry.getKey()));
                        }
                        resourceResponse.setResponseHeaders(responseHeaders);

                        //set response code
                        if (responseCode != 200) {
                            //use reflection to set the actual response code, if don't will crash
                            Field f = WebResourceResponse.class.getDeclaredField("mStatusCode");
                            f.setAccessible(true);
                            f.setInt(resourceResponse, responseCode);
                        }
                    }
                }
            }
            catch (IOException | NoSuchFieldException | IllegalAccessException e) {
                LOG.e(LOG_TAG, e.getLocalizedMessage());
            }
        }

        return shouldInterceptRequest(urlString, resourceResponse, request.getMethod());
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
        LOG.d(LOG_TAG, "onPageStarted:" + url);
        super.onPageStarted(view, url, favicon);

//        injected = false;
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
        if (brwoserPlugin.webViewHandler != null) {
            brwoserPlugin.webViewHandler.setUrlEditText(newloc);
            brwoserPlugin.webViewHandler.progressBar.setVisibility(View.VISIBLE);
        }

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
        LOG.d(LOG_TAG, "onPageFinished:" + url);
        super.onPageFinished(view, url);

//  Move the script to atDocumentStartScript.
//        // Set the namespace for postMessage()
//        brwoserPlugin.injectDeferredObject("window.webkit={messageHandlers:{essentialsExtractor:essentialsExtractor}}", null);

       // Get the head from html
       brwoserPlugin.injectDeferredObject("window.essentialsExtractor.processHTML((!document || !document.getElementsByTagName || document.getElementsByTagName('head').length == 0) ? '' : document.getElementsByTagName('head')[0].innerHTML)", null);

        //Note: when use serviceWorker to load main html, the shouldInterceptRequest can't intercept
        // the main html, then can't inject the web3 provider js script. so unregister serviceWorker
        // after the page load finish.
        brwoserPlugin.injectDeferredObject("(function() { " +
                "   if (navigator.serviceWorker) {\n" +
                "       navigator.serviceWorker.getRegistrations().then(function(registrations) {\n" +
                "           for(let registration of registrations) {\n" +
                "               console.log(registration);\n" +
                "               registration.unregister();\n" +
                "           } " +
                "       }); " +
                "   } " +
                "})();", null);

        // CB-10395 DappBrowser's WebView not storing cookies reliable to local device storage
        CookieManager.getInstance().flush();

        // // https://issues.apache.org/jira/browse/CB-11248
        // view.clearFocus();
        // view.requestFocus();

        if (brwoserPlugin.webViewHandler != null) {
            brwoserPlugin.webViewHandler.progressBar.setVisibility(View.GONE);
        }

        try {
            JSONObject obj = new JSONObject();
            obj.put("type", LOAD_STOP_EVENT);
            obj.put("url", url);

            brwoserPlugin.sendEventCallback(obj, true);
        } catch (JSONException ex) {
            LOG.d(LOG_TAG, "Should never happen");
        }
    }

    public void onReceivedError (WebView view, WebResourceRequest request, WebResourceError error) {
        String failingUrl = request.getUrl().toString();
        try {
            JSONObject obj = new JSONObject();
            obj.put("type", LOAD_ERROR_EVENT);
            obj.put("url", failingUrl);
            obj.put("code", error.getErrorCode());
            obj.put("message", error.getDescription());

            brwoserPlugin.sendEventCallback(obj, true, PluginResult.Status.ERROR);
        } catch (JSONException ex) {
            LOG.d(LOG_TAG, "Should never happen");
        }
    }

    @Override
    public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
       // If debuggable version, it will don't cancel and return.
       if (brwoserPlugin.isDebuggable()) {
           handler.proceed();
           return;
       }

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
        LOG.d(LOG_TAG, "onLoadResource:" + url);
        super.onLoadResource(view, url);
    }

    public InputStream injectJSInHeadTag(InputStream inputStream) throws IOException {
        if (inputStream == null || this.atDocumentStartScript == null) {
            return null;
        }

        BufferedReader buf = new BufferedReader(new InputStreamReader(inputStream));
        StringBuilder stringBuilder = new StringBuilder();
        for (String line; (line = buf.readLine()) != null; ) {
            stringBuilder.append(line).append('\n');
        }
        String html = stringBuilder.toString();
        html = html.replaceFirst("(<head\\b[^>]*>)", "$1<script type='text/javascript'> essentials_atdocumentstartscript_value </script>");
        html = html.replace("essentials_atdocumentstartscript_value", this.atDocumentStartScript);
        return new ByteArrayInputStream(html.getBytes());
    }

//    private synchronized void injectWeb3ProviderScript(WebResourceRequest request) {
//        String url = request.getUrl().toString();
//        if (!injected && (!request.isForMainFrame() || (this.originUrl != null) && !url.equals(this.originUrl))) {
//            brwoserPlugin.injectDeferredObject(brwoserPlugin.webViewHandler.options.atdocumentstartscript, null);
//            injected = true;
//        }
//    }

    public static void setSslVerifier() throws NoSuchAlgorithmException, KeyManagementException {
        // Set up a Trust all manager
        TrustManager[] trustAllCerts = new TrustManager[] { new X509TrustManager()
        {
            public java.security.cert.X509Certificate[] getAcceptedIssuers()
            {
                return null;
            }

            public void checkClientTrusted(
                    java.security.cert.X509Certificate[] certs, String authType)
            {
            }

            public void checkServerTrusted(
                    java.security.cert.X509Certificate[] certs, String authType)
            {
            }
        } };

        // Get a new SSL context
        SSLContext sc = SSLContext.getInstance("TLSv1.2");
        sc.init(null, trustAllCerts, new java.security.SecureRandom());
        // Set our connection to use this SSL context, with the "Trust all" manager in place.
        HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());

        // Also force it to trust all hosts
        HostnameVerifier allHostsValid = new HostnameVerifier() {
            public boolean verify(String hostname, SSLSession session) {
                return true;
            }
        };
        // and set the hostname verifier.
        HttpsURLConnection.setDefaultHostnameVerifier(allHostsValid);
    }

    public boolean isDefinedCustomScheme(String url) {
        for (int i = 0; i < customSchemeFilters.length; i++) {
            if (url.startsWith(customSchemeFilters[i])) {
                return true;
            }
        }

        return false;
    }
}
