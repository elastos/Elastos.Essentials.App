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
    -d "https://did.elastos.net/test"
```
## Manually invoke the verification process (android)

```
adb shell pm verify-app-links --re-verify org.elastos.essentials.app
```

## Review the verification results (android)

```
adb shell pm get-app-links org.elastos.essentials.app
```

This command should show essentials in the result. If not, this means the registration has a problem.
And the domain verification state should be "verified" for all domains.

## Other useful android commands

**List app links preferences and statefor all apps**:
```
adb shell dumpsys package domain-preferred-apps
```

## Android SHA256 fingerprints

**Google play prod (managed app signing)**
86:C6:B9:68:6F:A7:4E:A1:25:02:5B:3F:FB:E2:D5:1C:A8:BF:1D:F6:42:A0:4A:41:F1:FB:EB:A1:AE:EF:D1:94

**Trinity tech debug keystore**
71:41:43:E7:07:40:67:5B:E6:EF:8D:E0:42:32:42:78:A4:5D:B8:F8:C1:3C:26:29:43:6C:72:04:5B:76:8E:30