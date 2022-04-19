# Ramp network integration notes

## Test environment - Rinkeby

- Widget URL: https://ri-widget-staging.firebaseapp.com/
- Demo app URL: https://ri-demo-staging.firebaseapp.com/
- API base URL: https://api-instant-staging.supozu.com/api

```
import { RampInstantSDK } from '@ramp-network/ramp-instant-sdk';

new RampInstantSDK({
  // ...
  url: 'https://ri-widget-staging.firebaseapp.com/',
  variant: 'mobile'
}).show();
```

## Purchase crypto steps

- Choose amount (search "test")
- Enter email address
- Confirm email address code
- Enter wallet address
- Confirm everything
- Open https://webhook.site/ from the browser and use the given url as webbook url for the ramp network widget (this is a temporary webapp to receive webhooks from the payment)
- Find the purchase id and purchase view token from the webhook
- Manuall release the tokens:

```
$ curl -X POST "https://api-instant-staging.supozu.com/api/widget/testing/purchase/ID/release?secret=purchaseViewToken"
```

## Test method provided by Ramp

https://docs.ramp.network/tips-tricks/#releasing-purchases-manually

You can make a test purchase without having to connect your own payment method (staging environments only):

- Add a new payment method, select "Manual Bank Transfer" (switch country to TEST if your country doesn't have that option).
- You should be back to the confirmation screen with "Any {currency} account" manual bank transfer payment method selected.
- Continue, the purchase will be created.
- Tick the box that says that you've transferred the funds and continue.
- Open the transaction summary link.
- Click the manual test release button at the bottom of the summary and wait a few moments until the confirmation is processed.
- You can also use an API call to automatically release staging purchases. You need purchase id and purchaseViewToken to do it. Both of those values are available via SDK events and webhooks.

```
$ curl -X POST "https://api-instant-staging.supozu.com/api/widget/testing/purchase/ID/release?secret=purchaseViewToken"
```