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

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.AsyncTask;
import android.text.TextUtils;
import android.util.Base64;
import android.util.Log;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.apache.http.HttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.DefaultHttpClient;
import org.elastos.did.DID;
import org.elastos.did.DIDBackend;
import org.elastos.did.DIDDocument;
import org.elastos.did.DefaultDIDAdapter;
import org.elastos.did.VerifiableCredential;
import org.elastos.did.exception.DIDResolveException;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.InputStreamReader;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;

import org.apache.http.client.HttpClient;
import org.json.JSONTokener;

import org.apache.cordova.*;

public class IntentManager {
    private static final String LOG_TAG = "IntentManager";

    private LinkedHashMap<Long, IntentInfo> intentContextList = new LinkedHashMap();
    private ArrayList<Uri> intentUriList = new ArrayList<Uri>();

    private static IntentManager intentManager;
    private boolean listenerReady = false;
    protected CallbackContext mIntentContext = null;
    private String[] internalIntentFilters;
    private String intentRedirecturlFilter;
    private String[] rawUrlIntentFilters;
    private Activity activity;

    IntentManager() {

    }

    public static IntentManager getShareInstance() {
        if (IntentManager.intentManager == null) {
            IntentManager.intentManager = new IntentManager();
        }
        return IntentManager.intentManager;
    }

    public void setActivity(Activity activity, CordovaPreferences preferences) {
        listenerReady = false;
        this.activity = activity;
        String filters = preferences.getString("InternalIntentFilters", "");
        internalIntentFilters = filters.split(" ");
        filters = preferences.getString("RawUrlIntentFilters", "");
        rawUrlIntentFilters = filters.split(" ");
        intentRedirecturlFilter = preferences.getString("IntentRedirecturlFilter", "https://essentials.elastos.net");
    }

    public boolean isInternalIntent(String action) {
        for (int i = 0; i < internalIntentFilters.length; i++) {
            if (action.startsWith(internalIntentFilters[i])) {
                return true;
            }
        }

        return false;
    }

    public boolean isRawUrl(String url) {
        for (int i = 0; i < rawUrlIntentFilters.length; i++) {
            if (url.startsWith(rawUrlIntentFilters[i])) {
                return true;
            }
        }

        return false;
    }

    public boolean isJSONType(String str) {
        str = str.trim();
        if ((str.startsWith("{") && str.endsWith("}"))
                || (str.startsWith("[") && str.endsWith("]"))) {
            return true;
        }
        return false;
    }

    public void showWebPage(String url) {
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.addCategory(Intent.CATEGORY_BROWSABLE);
        Uri uri = Uri.parse(url);
        intent.setData(uri);
        activity.startActivity(intent);
    }

    public void alertDialog(String title, String msg) {
        activity.runOnUiThread(() -> {
            AlertDialog.Builder ab = new AlertDialog.Builder(activity);
            ab.setTitle(title);
            ab.setMessage(msg);
            ab.setIcon(android.R.drawable.ic_dialog_alert);

            ab.setPositiveButton("OK", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface dialog, int which) {

                }
            });
            ab.show();
        });
    }

    private void initializeDIDBackend() throws DIDResolveException {
        String cacheDir = activity.getFilesDir() + "/data/did/.cache.did.elastos";;
        DIDBackend.initialize(new DefaultDIDAdapter("https://api.elastos.io/eid"));
    }

    public void setIntentUri(Uri uri) {
        if (uri == null) return;

        if (!uri.toString().contains("redirecturl") && uri.toString().contains("/intentresponse")) {
            receiveExternalIntentResponse(uri);
        }
        else if (listenerReady) {
            doIntentByUri(uri);
        }
        else {
            intentUriList.add(uri);
        }
    }

    public void setListenerReady(CallbackContext callbackContext) {
        mIntentContext = callbackContext;
        listenerReady = true;

        for (int i = 0; i < intentUriList.size(); i++) {
            Uri uri = intentUriList.get(i);
            doIntentByUri(uri);
        }
        intentUriList.clear();
    }

    public void onReceiveIntent(IntentInfo info) {
        if (mIntentContext == null)
            return;

        addToIntentContextList(info);
        JSONObject ret = new JSONObject();
        try {
            ret.put("action", info.action);
            ret.put("params", info.params);
            ret.put("intentId", info.intentId);
            ret.put("originalJwtRequest", info.originalJwtRequest);
            ret.put("from", info.from);

            PluginResult result = new PluginResult(PluginResult.Status.OK, ret);
            result.setKeepCallback(true);
            mIntentContext.sendPluginResult(result);
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public void onReceiveIntentResponse(IntentInfo info) {
        if (info.callbackContext == null) {
            return;
        }

        JSONObject ret = new JSONObject();
        try {
            ret.put("action", info.action);
            if (info.params != null) {
                ret.put("result", info.params);
            } else {
                ret.put("result", "null");
            }
            if (info.responseJwt != null)
                ret.put("responseJWT", info.responseJwt);

            PluginResult result = new PluginResult(PluginResult.Status.OK, ret);
            result.setKeepCallback(false);
            info.callbackContext.sendPluginResult(result);
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    private synchronized void addToIntentContextList(IntentInfo info) {
        IntentInfo intentInfo = intentContextList.get(info.intentId);
        if (intentInfo != null) {
            return;
        }

        intentContextList.put(info.intentId, info);
    }

    public static JSONObject parseJWT(String jwt) throws Exception {
        // Remove the Signature from the received JWT for now, we don't handle this.
        // TODO: extract the JWT issuer field from the JWT, resolve its DID from the DID sidechain, and
        // verify the JWT using the public key. JWT will have to be signed by the app developer's DID's private key.
        String[] splitToken = jwt.split("\\.");

        if (splitToken.length == 0)
            throw new Exception("Invalid JWT Token in parseJWT(): it contains only a header but no payload or signature");

        String jwtPayload = splitToken[1];
        byte[] b64PayloadBytes = Base64.decode(jwtPayload, Base64.URL_SAFE);
        String b64Payload = new String(b64PayloadBytes, "UTF-8");

        JSONObject jwtPayloadJson = new JSONObject(b64Payload);

        return jwtPayloadJson;
    }

    public void getParamsByJWT(String jwt, IntentInfo info) throws Exception {
        JSONObject jwtPayload = parseJWT(jwt);

        jwtPayload.put("type", "jwt");
        info.params = jwtPayload.toString();

        if (jwtPayload.has("iss")) {
            info.aud = jwtPayload.getString("iss").toString();
        }
        if (jwtPayload.has("appid")) {
            info.req = jwtPayload.getString("appid").toString();
        }
        if (jwtPayload.has(IntentInfo.REDIRECT_URL)) {
            info.redirecturl = jwtPayload.getString(IntentInfo.REDIRECT_URL).toString();
        }
        else if (jwtPayload.has(IntentInfo.CALLBACK_URL)) {
            info.callbackurl = jwtPayload.getString(IntentInfo.CALLBACK_URL).toString();
        }
        info.type = IntentInfo.JWT;
        info.originalJwtRequest = jwt;
    }


    public void getParamsByUri(Uri uri, IntentInfo info) throws Exception {
        Set<String> set = uri.getQueryParameterNames();
        JSONObject json = new JSONObject();
        for (String key : set) {
            String value = uri.getQueryParameter(key);
            if (key.equals(IntentInfo.REDIRECT_URL)) {
                info.redirecturl = value;
            }
            else if (key.equals(IntentInfo.CALLBACK_URL)) {
                info.callbackurl = value;
            }
            else if (key.equals("iss")) {
                info.aud = value;
            }
            else if (key.equals("appid")) {
                info.req = value;
            }

            if (isJSONType(value)) {
                Object obj = new JSONTokener(value).nextValue();
                json.put(key, obj);
            }
            else {
                json.put(key, value);
            }
        }

        info.type = IntentInfo.URL;
        info.params = json.toString();
    }

    public IntentInfo parseIntentUri(Uri uri, CallbackContext callbackContext) throws Exception {
        IntentInfo info = null;
        String url = uri.toString();

        if (isRawUrl(url)) {
            info = new IntentInfo("rawurl", "{\"url\":\"" + url + "\"}", callbackContext);
            info.from = IntentInfo.EXTERNAL;
            onReceiveIntent(info);
            return null;
        }
        else if (!url.contains("://")) {
            throw new Exception("The url: '" + url + "' is error!");
        }

        if (url.startsWith("elastos://") && !url.startsWith("elastos:///")) {
            url = "elastos:///" + url.substring(10);
            uri = Uri.parse(url);
        }
        List<String> list = uri.getPathSegments();
        if (list.size() > 0) {
            String[] paths = new String[list.size()];
            list.toArray(paths);
            String host = uri.getHost();
            String action = null;
            if (host == null || host.isEmpty()) {
                throw new Exception("The action: '" + paths[0] + "' is invalid!");
            }
            else {
                action = uri.getScheme() + "://" + uri.getHost() + "/" + paths[0];
            }
            Set<String> set = uri.getQueryParameterNames();

            info = new IntentInfo(action, null, callbackContext);
            if (!isInternalIntent(info.action)) {
                info.from = IntentInfo.EXTERNAL;
            }

            if (set.size() > 0) {
                getParamsByUri(uri, info);
            }
            else if (list.size() == 2) {
                getParamsByJWT(paths[1], info);
            }
        }

        return info;
    }

    public void receiveIntent(Uri uri, CallbackContext callbackContext) throws Exception {
        IntentInfo info = parseIntentUri(uri, callbackContext);
        if (info != null && info.params != null) {
            // We are receiving an intent from an external application. Do some sanity check.
            checkExternalIntentValidity(info, (isValid, errorMessage)->{
                if (isValid) {
                    Log.d(LOG_TAG, "The external intent is valid.");
                    try {
                        onReceiveIntent(info);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
                else {
                    System.err.println(errorMessage);
                    this.alertDialog("Invalid intent received", "The received intent could not be handled and returned the following error: "+errorMessage);
                }
            });
        }
    }

    public void doIntentByUri(Uri uri) {
        try {
            receiveIntent(uri, null);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private interface OnExternalIntentValidityListener {
        void onExternalIntentValid(boolean isValid, String errorMessage);
    }

    private void checkExternalIntentValidity(IntentInfo info, OnExternalIntentValidityListener callback) throws Exception {
        Log.d(LOG_TAG, "Checking external intent validity");

        // If the intent contains an appDid param and a redirectUrl (or callbackurl), then we must check that they match.
        // This means that the app did document from the ID chain must contain a reference to the expected redirectUrl/callbackUrl.
        // This way, we make sure that an application is not trying to act on behalf of another one by replacing his DID.
        // Ex: access to hive vault.
        if (info.redirecturl != null || info.callbackurl != null) {
            try {
                JSONObject params = new JSONObject(info.params);
                if (params.has("appdid")) {
                    // So we need to resolve this DID from chain and make sure that it matches the target redirect/callback url
                    checkExternalIntentValidityForAppDID(info, params.getString("appdid"), callback);
                } else {
                    callback.onExternalIntentValid(true, null);
                }
            } catch (JSONException e) {
                e.printStackTrace();
                callback.onExternalIntentValid(false, "Intent parameters must be a JSON object");
            }
        }
        else {
            callback.onExternalIntentValid(true, null);
        }
    }

    @SuppressLint("StaticFieldLeak")
    private void checkExternalIntentValidityForAppDID(IntentInfo info, String appDid, OnExternalIntentValidityListener callback) throws Exception {
        initializeDIDBackend();

        new AsyncTask<Void, Void, DIDDocument>() {
            @Override
            protected DIDDocument doInBackground(Void... voids) {
                DIDDocument didDocument = null;
                try {
                    didDocument = new DID(appDid).resolve(true);
                    if (didDocument == null) { // Not found
                        callback.onExternalIntentValid(false, "No DID found on chain matching the application DID "+appDid);
                    }
                    else {
                        // DID document found. // Look for the #native credential
                        VerifiableCredential nativeCredential = didDocument.getCredential("#native");
                        if (nativeCredential == null) {
                            callback.onExternalIntentValid(false, "No #native credential found in the app DID document. Was the 'redirect/callback url' configured and published on chain, using the developer tool dApp?");
                        }
                        else {
                            // Check redirect url, if any
                            if (info.redirecturl != null && !info.redirecturl.equals("")) {
                                // ANDROID ONLY - First use the custom scheme if any, otherwise fallback to the redirect url
                                // IOS should use the redirect url.
                                String onChainCustomScheme = (String)nativeCredential.getSubject().getProperty("customScheme");
                                if (onChainCustomScheme == null) {
                                    // No custom scheme: try the redirect url
                                    String onChainRedirectUrl = (String)nativeCredential.getSubject().getProperty("redirectUrl");
                                    if (onChainRedirectUrl == null) {
                                        callback.onExternalIntentValid(false, "No redirectUrl found in the app DID document. Was the 'redirect url' configured and published on chain, using the developer tool dApp?");
                                    }
                                    else {
                                        // We found a redirect url in the app DID document. Check that it matches the one in the intent
                                        if (info.redirecturl.startsWith(onChainRedirectUrl)) {
                                            // Everything ok.
                                            callback.onExternalIntentValid(true, null);
                                        }
                                        else {
                                            callback.onExternalIntentValid(false, "The registered redirect url in the App DID document ("+onChainRedirectUrl+") doesn't match with the received intent redirect url ("+info.redirecturl+")");
                                        }
                                    }
                                }
                                else {
                                    // We found a custom scheme in the app DID document. Check that it matches the redirect url in the intent
                                    if (info.redirecturl.startsWith(onChainCustomScheme)) {
                                        // Everything ok.
                                        callback.onExternalIntentValid(true, null);
                                    }
                                    else {
                                        callback.onExternalIntentValid(false, "The registered custom scheme in the App DID document ("+onChainCustomScheme+") doesn't match with the received intent redirect url ("+info.redirecturl+")");
                                    }
                                }
                            }
                            // Check callback url, if any
                            else if (info.callbackurl != null && !info.callbackurl.equals("")) {
                                String onChainCallbackUrl = (String)nativeCredential.getSubject().getProperty("callbackurl");
                                if (onChainCallbackUrl == null) {
                                    callback.onExternalIntentValid(false, "No callbackurl found in the app DID document. Was the 'callback url' configured and published on chain, using the developer tool dApp?");
                                }
                                else {
                                    // We found a callback url in the app DID document. Check that it matches the one in the intent
                                    if (info.callbackurl.startsWith(onChainCallbackUrl)) {
                                        // Everything ok.
                                        callback.onExternalIntentValid(true, null);
                                    }
                                    else {
                                        callback.onExternalIntentValid(false, "The registered callback url in the App DID document ("+onChainCallbackUrl+") doesn't match with the received intent callback url");
                                    }
                                }
                            }
                            else {
                                // Everything ok. No callback url or redirect url, so we don't need to check anything.
                                callback.onExternalIntentValid(true, null);
                            }
                        }
                    }
                }
                catch (Exception e) {
                    callback.onExternalIntentValid(false, e.getMessage());
                }
                return didDocument;
            }
        }.execute();
    }

    private String addParamLinkChar(String url) {
        if (url.contains("?")) {
            url += "&";
        }
        else {
            url += "?";
        }
        return url;
    }

    private String createUriParamsFromIntentInfoParams(IntentInfo info) throws Exception {

        // Convert intent info params into a serialized json string for the target url
        JSONObject params = new JSONObject(info.params);

//        params.put("appdid", appManager.getAppInfo(info.fromId).did);

        String url = info.action;

        Iterator<String> firstLevelKeys = params.keys();
        while (firstLevelKeys.hasNext()) {
            url = addParamLinkChar(url);
            String key = firstLevelKeys.next();
            url += key + "=" + Uri.encode(params.get(key).toString());
        }

        // If there is no redirect url, we add one to be able to receive responses
        if (!params.has("redirecturl")) {
            // "intentresponse" is added For trinity native. NOTE: we should maybe move this out of this method
            url = addParamLinkChar(url);
            url += "redirecturl=" + intentRedirecturlFilter + "/intentresponse%3FintentId=" + info.intentId; // Ex: diddemo:///intentresponse?intentId=xxx
        }

        System.out.println("INTENT DEBUG: " + url);
        return url;
    }

    public String createUnsignedJWTResponse(IntentInfo info, String result) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        Map<String, Object> claims = mapper.readValue(result, Map.class);

        JwtBuilder builder = Jwts.builder()
                .setHeaderParam("type", "JWT")
                .addClaims(claims)
                .claim("req", info.req)
                .claim("method", info.action)
                .setIssuedAt(new Date())
                .setAudience(info.aud);

        return builder.compact();
    }

    public String createUrlResponse(IntentInfo info, String result) throws Exception {
        JSONObject ret = new JSONObject(result);
        if (info.req != null) {
            ret.put("req", info.req);
        }
        if (info.aud != null) {
            ret.put("aud", info.aud);
        }
        ret.put("iat", (int)(System.currentTimeMillis()/1000));
        ret.put("method", info.action);
        return ret.toString();
    }

    public void postCallback(String name, String value, String callbackurl) throws Exception {
        HttpClient httpClient = new DefaultHttpClient();
        HttpPost httpPost = new HttpPost(callbackurl);
        httpPost.addHeader("Content-Type", "application/json;charset=UTF-8");

        JSONObject json = new JSONObject();
        json.put(name, value);
        StringEntity entity = new StringEntity(json.toString(), "UTF-8");
        entity.setContentType("application/json");
        httpPost.setEntity(entity);

        HttpResponse httpResponse = httpClient.execute(httpPost);
        if (httpResponse != null
                && httpResponse.getStatusLine().getStatusCode() == 200) {
            Log.d(LOG_TAG, "Intent callback url called and returned with success");
        }
        else {
            String err = "Send callbackurl error";
            if (httpResponse != null) {
                err += ": " + httpResponse.getStatusLine().getStatusCode();
            }
            err += ". ";

            // Try to get a more specific error message from the page body
            {
                int n;
                char[] buffer = new char[1024 * 4];
                InputStreamReader reader = new InputStreamReader(httpResponse.getEntity().getContent(), "utf8");
                StringWriter writer = new StringWriter();
                while (-1 != (n = reader.read(buffer))) writer.write(buffer, 0, n);

                err += writer.toString();
            }

            throw new Exception(err);
        }
    }

    private String getResultUrl(String url, String result) {
        String param = "?result=";
        if (url.contains("?")) {
            param = "&result=";
        }
        return url + param + Uri.encode(result);
    }

    private String getJWTRedirecturl(String url, String jwt) {
        int index = url.indexOf("?");
        if (index != -1) {
            String params = url.substring(index);
            url = url.substring(0, index);
            return url + "/" + jwt + params;
        }
        else {
            return url + "/" + jwt;
        }
    }

    /**
     * Helper class to deal with app intent result types that can be either JSON objects with raw data,
     * or JSON objects with "jwt" special field.
     */
    private class IntentResult {
        String rawResult;
        JSONObject payload;
        String jwt = null;

        IntentResult(String result) throws Exception {
            this.rawResult = result;

            JSONObject resultAsJson = new JSONObject(result);
            if (resultAsJson.has("jwt")) {
                // The result is a single field named "jwt", that contains an already encoded JWT token
                if (!resultAsJson.isNull("jwt")) {
                    jwt = resultAsJson.getString("jwt");
                    payload = parseJWT(jwt);
                } else {
                    jwt = null;
                    payload = new JSONObject(); // Null response -> Empty JSON payload
                }
            }
            else {
                // The result is a simple JSON object
                payload = resultAsJson;
            }
        }

        String payloadAsString() {
            return payload.toString();
        }

        boolean isAlreadyJWT() {
            return jwt != null;
        }
    }

    public void sendIntentResponse(String result, long intentId) throws Exception {
        // Retrieve intent context information for the given intent id
        IntentInfo info = intentContextList.get(intentId);
        if (info == null) {
            throw new Exception("Intent information for intent ID "+intentId + " doesn't exist!");
        }
        intentContextList.remove(intentId);

        // The result object can be either a standard json object, or a {jwt:JWT} object.
        IntentResult intentResult = new IntentResult(result);

        String url = info.redirecturl;
        if (url == null) {
            url = info.callbackurl;
        }

        // If there is a provided URL callback for the intent, we want to send the intent response to that url
        if (url != null  && !url.equals("")) {
            String jwt;
            if (intentResult.isAlreadyJWT())
                jwt = intentResult.jwt;
            else {
                // App did not return a JWT, so we return an unsigned JWT instead
                jwt = createUnsignedJWTResponse(info, result);
            }

            // Response url can't be handled by trinity. So we either call an intent to open it, or HTTP POST data
            if (info.redirecturl != null) {
                if (intentResult.isAlreadyJWT())
                    url = getJWTRedirecturl(info.redirecturl, jwt);
                else
                    url = getResultUrl(url, intentResult.payloadAsString()); // Pass the raw data as a result= field
                showWebPage(url);
            }
            else if (info.callbackurl != null  && !info.callbackurl.equals("")) {
                if (intentResult.isAlreadyJWT())
                    postCallback("jwt", jwt, info.callbackurl);
                else
                    postCallback("result", intentResult.payloadAsString(), info.callbackurl);
            }
        }
        else if (info.callbackContext != null) {
            info.params = intentResult.payloadAsString();
            // If the called dapp has generated a JWT as output, we pass the decoded payload to the calling dapp
            // for convenience, but we also forward the raw JWT as this is required in some cases.
            if (intentResult.isAlreadyJWT())
                info.responseJwt = intentResult.jwt;
            onReceiveIntentResponse(info);
        }
    }

    public void receiveExternalIntentResponse(Uri uri) {
        String url = uri.toString();
        System.out.println("RECEIVED: " + url);

        String resultStr = null;
        if (url.contains("result=")) {
            // Result received as a raw string / raw json string
            resultStr = uri.getQueryParameter("result");
        }
        else {
            // Consider the received result as a JWT token
            resultStr = "{jwt:\""+uri.getLastPathSegment()+"\"}";
        }
        System.out.println(resultStr);

        long intentId = -1;
        if (url.contains("intentId=")) {
            String id = uri.getQueryParameter("intentId");
            intentId = Long.parseLong(id);
        }

        try {
            sendIntentResponse(resultStr, intentId);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    void sendIntent(IntentInfo info) throws Exception {
        if (info.action.equals("share")) {
            sendNativeShareAction(info);
        }
        else if (info.action.equals("openurl")) {
            sendNativeOpenUrlAction(info);
        }
        else if (isInternalIntent(info.action)) {
            onReceiveIntent(info);
        }
        else {
            sendIntentToExternal(info);
        }
    }

    void sendIntentToExternal(IntentInfo info) throws Exception {
        if (!isJSONType(info.params)) {
            throw new Exception("Intent parameters must be a JSON object");
        }

        addToIntentContextList(info);
        String url = createUriParamsFromIntentInfoParams(info);

        showWebPage(url);
    }

    public class ShareIntentParams {
        String title = null;
        Uri url = null;
    }

    private ShareIntentParams extractShareIntentParams(IntentInfo info) {
        // Extract JSON params from the share intent. Expected format is {title:"", url:""} but this
        // could be anything as this is set by users.
        if (info.params == null) {
            System.out.println("Share intent params are not set!");
            return null;
        }

        JSONObject jsonParams = null;
        try {
            jsonParams = new JSONObject(info.params);
        } catch (JSONException e) {
            System.out.println("Share intent parameters are not JSON format");
            return null;
        }

        ShareIntentParams shareIntentParams = new ShareIntentParams();

        shareIntentParams.title  = jsonParams.optString("title");

        String url = jsonParams.optString("url");
        if (url != null) {
            shareIntentParams.url = Uri.parse(url);
        }

        return shareIntentParams;
    }

    void sendNativeShareAction(IntentInfo info) {
        ShareIntentParams extractedParams = extractShareIntentParams(info);
        if (extractedParams != null)  {
            // Can't send an empty share action
            if (extractedParams.title == null && extractedParams.url == null)
                return;

            android.content.Intent sendIntent = new android.content.Intent();
            sendIntent.setAction(android.content.Intent.ACTION_SEND);

            ArrayList<String> extraTextParams = new ArrayList();
            if (extractedParams.title != null)
                extraTextParams.add(extractedParams.title);

            if (extractedParams.url != null)
                extraTextParams.add(extractedParams.url.toString());

            sendIntent.putExtra(android.content.Intent.EXTRA_TEXT,  TextUtils.join(" ", extraTextParams));

            sendIntent.setType("text/plain");

            android.content.Intent shareIntent = android.content.Intent.createChooser(sendIntent, null);
            activity.startActivity(shareIntent);
        }
    }

    public class OpenUrlIntentParams {
        Uri url = null;
    }

    private OpenUrlIntentParams extractOpenUrlIntentParams(IntentInfo info) {
        // Extract JSON params from the open url intent. Expected format is {url:""}.
        if (info.params == null) {
            System.out.println("Openurl intent params are not set!");
            return null;
        }

        JSONObject jsonParams = null;
        try {
            jsonParams = new JSONObject(info.params);
        } catch (JSONException e) {
            System.out.println("Openurl intent parameters are not JSON format");
            return null;
        }

        OpenUrlIntentParams openUrlIntentParams = new OpenUrlIntentParams();

        String url = jsonParams.optString("url");
        if (url != null) {
            openUrlIntentParams.url = Uri.parse(url);
        }

        return openUrlIntentParams;
    }

    void sendNativeOpenUrlAction(IntentInfo info) {
        OpenUrlIntentParams extractedParams = extractOpenUrlIntentParams(info);
        if (extractedParams != null)  {
            // Can't send an empty open url action
            if (extractedParams.url == null)
                return;

            android.content.Intent sendIntent = new android.content.Intent();
            sendIntent.setAction(Intent.ACTION_VIEW);
            sendIntent.setData(extractedParams.url);

            android.content.Intent shareIntent = android.content.Intent.createChooser(sendIntent, null);
            activity.startActivity(shareIntent);
        }
    }
}
