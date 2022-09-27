---
title: IntentManager
description:This is an internal plugin for Essentials in order to manage internal and external inter-app communications through "intents".
---

# elastos-essentials-plugin-intent

This plugin defines a global `cordova.essentialsIntentManager` object, which provides an API for essentials intent manager library.

Although in the global scope, it is not available until after the `deviceready` event.

```js
document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady() {
    console.log(essentialsIntentManager);
}
```

## Usage
###  In typescript file
```ts
declare let essentialsIntentManager: EssentialsIntentPlugin.IntentManager;
```

---
## Installation

```bash
    cordova plugin add elastos-essentials-plugin-intent
```

## Cofigure
### tsconfig.app.json
```json
    "types": [
        "elastos-essentials-plugin-intent"
        ]
```

### config.xml
- Add InternalIntentFilters, RawUrlIntentFilters and IntentRedirecturlFilter.
```xml
    <preference name="InternalIntentFilters" value="https://did.elastos.net https://wallet.elastos.net https://hive.elastos.net https://contact.elastos.net https://scanner.elastos.net" />
    <preference name="IntentRedirecturlFilter" value="https://essentials.elastos.net" />
    <preference name="RawUrlIntentFilters" value="wc: https://wallet.elastos.net/wc:" />
```

```xml
    <platform name="android">
        <config-file parent="/manifest/application/activity" target="AndroidManifest.xml">
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:host="essentials.elastos.net" android:pathPattern="/.*" android:scheme="https" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:host="did.elastos.net" android:pathPattern="/.*" android:scheme="https" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:host="wallet.elastos.net" android:pathPattern="/.*" android:scheme="https" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:host="hive.elastos.net" android:pathPattern="/.*" android:scheme="https" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:host="contact.elastos.net" android:pathPattern="/.*" android:scheme="https" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:host="scanner.elastos.net" android:pathPattern="/.*" android:scheme="https" />
            </intent-filter>
        </config-file>
    </platform>
    <platform name="ios">
        <preference name="SwiftVersion" value="5.2" />
        <preference name="UseSwiftLanguageVersion" value="5.2" />
        <config-file parent="com.apple.developer.associated-domains" target="*-Debug.plist">
            <array>
                <string>applinks:essentials.elastos.net</string>
                <string>applinks:launcher.elastos.net</string>
                <string>applinks:did.elastos.net</string>
                <string>applinks:wallet.elastos.net</string>
                <string>applinks:hive.elastos.net</string>
                <string>applinks:contact.elastos.net</string>
                <string>applinks:scanner.elastos.net</string>
            </array>
        </config-file>
        <config-file parent="com.apple.developer.associated-domains" target="*-Release.plist">
            <array>
                <string>applinks:essentials.elastos.net</string>
                <string>applinks:launcher.elastos.net</string>
                <string>applinks:did.elastos.net</string>
                <string>applinks:wallet.elastos.net</string>
                <string>applinks:hive.elastos.net</string>
                <string>applinks:contact.elastos.net</string>
                <string>applinks:scanner.elastos.net</string>
            </array>
        </config-file>
    </platform>
```

- In android platform
```xml
    <platform name="android">
        <preference name="AndroidLaunchMode" value="singleTask" />
    </platform>
```

## Supported Platforms

- Android
- iOS

## Classes

<dl>
<dt><a href="#IntentManager">IntentManager</a></dt>
<dd></dd>
</dl>

## Typedefs
<dl>
<dt><a href="#ReceivedIntent">ReceivedIntent</a> : <code>Object</code></dt>
<dd><p>Information about an intent request.</p>
</dd>
</dl>

<dl>
<dt><a href="#IntentSource">IntentSource</a> : <code>enum</code></dt>
<dd><p>Information about an intent from.</p>
</dd>
</dl>

<a name="IntentManager"></a>

## IntentManager
**Kind**: global class

* [IntentManager](#IntentManager)
    * [.sendIntent(action, params](#IntentManager+sendIntent)
    * [.addIntentListener(callback: (msg: ReceivedIntent)=>void)](#IntentManager+addIntentListener)
    * [.sendIntentResponse(action, result, intentId)](#IntentManager+sendIntentResponse)

<a name="IntentManager+sendIntent"></a>

### appManager.sendIntent(action, params, onSuccess, [onError])
Send a intent by action.

**Kind**: instance method of [<code>IntentManager</code>](#IntentManager)

| Param | Type | Description |
| --- | --- | --- |
| action | <code>string</code> | The intent action. |
| params | <code>Object</code> | The intent params. |

<a name="IntentManager+addIntentListener"></a>

### appManager.addIntentListener(callback: (msg: ReceivedIntent)=>void)
Set intent listener for message callback.

**Kind**: instance method of [<code>IntentManager</code>](#IntentManager)

| Param | Type | Description |
| --- | --- | --- |
| callback | [<code>(msg: ReceivedIntent)=>void</code>](#onReceiveIntent) | The function receive the intent. |

<a name="IntentManager+sendIntentResponse"></a>

### appManager.sendIntentResponse(action, result, intentId, onSuccess, [onError])
Send a intent respone by id.

**Kind**: instance method of [<code>IntentManager</code>](#IntentManager)

| Param | Type | Description |
| --- | --- | --- |
| action | <code>string</code> | The intent action. |
| result | <code>Object</code> | The intent respone result. |
| intentId | <code>long</code> | The intent id. |

<a name="ReceivedIntent"></a>

## ReceivedIntent : <code>Object</code>
Information about an intent request.

**Kind**: IntentPlugin typedef
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| action | <code>string</code> | The action requested from the receiving application. |
| params | <code>any</code> | Custom intent parameters provided by the calling application. |
| intentId | <code>number</code> | The intent id of the calling application. |
| originalJwtRequest? | <code>string</code> | In case the intent comes from outside essentials and was received as a JWT, this JWT is provided here. |
| from | [<code>IntentSource</code>](#IntentSource) | From 'internal' or 'external'.. |

## IntentSource : <code>enum</code>
Information about an intent request.

**Kind**: IntentPlugin enum
**Properties**

| Name | Value | Description |
| --- | --- | --- |
| Internal | "INTERNAL" | The intent from internal. |
| External | "EXTERNAL" | The intent from external.  |
