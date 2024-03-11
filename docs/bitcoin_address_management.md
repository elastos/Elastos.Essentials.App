# Bitcoin address management

Bitcoin is handled a bit differently from other networks are the same HD wallet (mnemonic) on the same network (Bitcoin) can use multiple address types (legacy, segwit, taproot). Different address types represent different wallets (different transactions, balance) contrary to networks such as iotex where even if there are 2 ways to represent addresses (0x and io), they both represent the same account.

## How it worked when only legacy addresses where supported

- BTCNetworkBase (BTCMainNetNetwork) creates the right BTCNetworkWallet (standard, ledger) according to the wallet type
- BTCNetworkWallet creates a BTCWalletJSSafe or BTCLedgerSafe
- The safe gets addresses and signs transactions

## How it works after integration or new address types (taproot)

- As usual, user creates a wallet with a mnemonic without choosing any network
- After switching to the bitcoin network, we use a default "bitcoin address type" (TBD: where is this active type saved?)
- User can change the address type from the wallet settings (only visible when bitcoin is the active network).
- Different bitcoin address types behave totally differently:
  - Different coin / nft list
  - Ability to show inscriptions or not
  - Different way to get addresses
  - Different way to sign
- For the above reasons:
  - We use different network wallets for each bitcoin address type
  - When user switches the bitcoin address type from wallet settings, a different network wallet becomes in use.