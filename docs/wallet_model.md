# Wallet model

Here are a few draft notes about how wallet classes are structured.

- MasterWallet
  - Root class that is highly related to the HD wallet key
  - Has name, wallet type, network options
  - Extended by:
    - StandardMasterWallet
      - Has a StandardWalletSafe (NOTE: different from "Safe" used to sign). Just a simple object to store master wallet's mnemonic/private keys for standard wallets.
      - Provides access to seed, mnemonic, private key
    - StandardMultiSigMasterWallet
- NetworkWallet
    - Instance of a master wallet (one root key) for a given network (elastos, heco, etc)
    - has subwallets (coins), nfts, master wallet, network, safe.
  - Extended by:
    - StandardNetworkWallet
    - StandardMultiSigNetworkWallet
    - LedgerNetworkWallet
- SubWallet
  - Related to a network wallet
  - Equivalent to a coin on the network (native, erc20).
  - Maintains coin's balance, USD valuation, name, transactions list
- Safe
  - Related to a network wallet
  - Used to get addresses, public keys, sign transaction
- WalletType
  - Simple enumeration that describe the nature of a master wallet
  - Different core wallet types like these behave totally differently so are considered are totally different "wallets" in the app.
  - Standard, Ledger, Multisig standard, Multisig gnosis evm
- AddressUsage
  - Simple enumeration used in various locations to know what an address is used for.
  - For example in the case of iotex, UI may display a ioxxx address but while executing EVM transactions, the EVM equivalent address is used and we need to inform the called service about this, so we use AddressUsage.