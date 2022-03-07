# Wallet JS SDK

## Origin

This Typescript SDK is originated from the Elastos C++ SPVSDK. That C++ SDK is a SPV SDK and as such, can synchronize blocks and manage many things.

This JS SDK diverges a little bit from that original SDK in a few ways:

* No SPV support. Only account/wallet, transactions, signature management, but transactions are retrieved and published by RPC APIs.
* A wallet store layer is added, in order to let apps provide their own storage solution for wallet data.
* Non elastos chains (eg BTC, Ripple) are not going to be supported. Elastos Wallet SDK must focus on the elastos chains only, and not try to support too many chains. Each chains needs to use its own SDK.