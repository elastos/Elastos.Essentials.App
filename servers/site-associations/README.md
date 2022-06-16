# Site associations

In order for Essentials to open universal links coming from external apps or websites, iOS and Android require us to verify that we own the domains by putting site association files on our servers.

## Target urls

- essentials.elastos.net
- launcher.elastos.net
- did.elastos.net
- wallet.elastos.net
- hive.elastos.net
- contact.elastos.net
- scanner.elastos.net
- elink.elastos.net
- packet.fun

## apple-app-site-association (iOS) location

- https://domain.name/apple-app-site-association
- https://domain.name/.well-known/apple-app-site-association

## assetlinks.json (android) location

- https://domain.name/.well-known/assetlinks.json

## Test command on android

```
adb shell am start -a android.intent.action.VIEW \
    -c android.intent.category.BROWSABLE \
    -d "http://did.elastos.net"
```
## Manually invoke the verification process (android)

```
adb shell pm verify-app-links --re-verify org.elastos.essentials.app
```

## Review the verification results (android)

```
adb shell pm get-app-links org.elastos.essentials.app
```
