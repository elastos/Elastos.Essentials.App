export const en = {

    'wallet': {
        /******************
        * Generic Actions *
        *******************/
        "send-to": "Send to",
        "enter-name": "Enter name",
        "enter-amount": "Enter amount",
        "total-amount": "TOTAL AMOUNT",
        "advanced-options": "Advanced Options",
        "recharge": "Recharge",
        "withdraw": "Transfer",
        "send": "Send",
        "from": "From",
        "to": "To",
        "amount": "Amount",
        "exit": "Exit",
        'click-to-load-more': "Click to load more",
        'transaction-fail': 'Transaction Failed',
        "confirmTitle": "Do you confirm?",
        "refresh-pulling-text": "Update Wallet",
        "refresh-refreshing-text": "Updating Wallet...",
        "intent-select-wallet": "Select Wallet",
        "personal-wallets-with": "Personal wallets with {{ subwalletSymbol }}",
        "find-new-token": "New Coin",
        "find-new-token-msg": "New coin {{ token }} found on {{ network }} network",
        "find-new-tokens-msg": "{{ count }} new coins found on {{ network }} network",

        /*******************
        * Generic Messages *
        ********************/
        "copied": "Copied to clipboard!",
        'text-did-balance-not-enough': 'Writing DID information on chain requires small amounts of ELA to pay the fees. Please transfer a few ELA (ex: 0.1 ELA) from your main wallet to the EID sidechain first!',
        'amount-null': "Please set an amount",
        "amount-invalid": "Please enter the correct amount",
        'eth-insuff-balance': 'You must have enough {{ coinName }} for gas fees in order to send ERC20 tokens',
        "sync-completed": "Sync completed",
        "not-a-valid-address": "Not a valid address",
        "transaction-pending": "There is already an on going transaction. Please wait for the transaction to be confirmed.",
        "share-erc20-token": "Check out this Elastos ERC20 Token",
        "privatekey": "Private Key",

        /************
        * Home Page *
        *************/
        "wallet-home-title": "Wallet Home",
        "wallet-overview": "Wallet Overview",
        "you-have-n-wallets": "YOU HAVE {{walletsCount}} TOKENS",
        "synced": "Synced",
        "syncing": "Syncing",
        "synchronized": "{{progress}}% synced",
        "sync-progress": "Synchronization {{progress}}%",
        "ela-erc20": "ELASTOS ERC20 TOKEN",
        "coin-list": "Token List",
        "staking-assets": "Staked Assets",
        "staking-assets-refresh": "Refresh",
        "staking-assets-refreshing": "Refreshing",
        "activate-hive-vault": "Activate Hive Vault",
        "pull-down-to-refresh": "Pull Down Screen to Refresh",
        "hive-not-configured-title": "Hive not configured",
        "hive-not-configured-text": "Your hive storage is not configured. Would you like to configure it now?",
        "hive-not-configured-not-now": "Not now",
        "hive-not-configured-configure": "Configure",
        "collectibles": "Collectibles",
        "networks": "Networks",
        "choose-active-network": "Choose your active network",
        "change-wallet": "Change wallet",
        "wallets": "Wallets",
        "explore-your-wallets": "Explore your wallets",
        "wallet-unsupported-on-network": "This wallet is unsupported on the {{ network }} network. Please select another network or wallet.",
        "wallet-connect-to-ledger": "Connect to ledger Wallet",

        /********************************************** General Settings Screen ***********************************************/

        /****************
        * Settings Page *
        *****************/
        'settings-title': 'Settings',
        "settings-general": "General",
        "settings-add-wallet": "Add Wallet",
        "settings-add-wallet-subtitle": "Create or import a new wallet",
        "settings-my-wallets": "My Wallets",
        "settings-my-wallets-subtitle": "Backup wallets and access their individual settings",
        "settings-currency": "Currency",
        "settings-currency-subtitle": "Select the default currency",
        "settings-custom-networks": "Custom Networks",
        "settings-custom-networks-subtitle": "Add and edit your custom networks here",
        "settings-manage-networks": "Manage Networks",
        "settings-manage-networks-subtitle": "Show and hide networks, add custom ones",
        "settings-add-wallet-standard-wallet": "Standard Wallet",
        "settings-add-wallet-multi-sig-wallet": "Multi Signature Wallet",
        "settings-add-wallet-hardware-wallet": "Connect H/W Wallet",
        "settings-add-wallet-new-wallet": "New Wallet",
        "settings-add-wallet-mnemonic": "Mnemonic / Paper key",

        /***********************
        * Select-Currency Page *
        ************************/
        "select-currency-title": "Select Currency",
        "available-currencies": "Available Currencies",
        "united-states-dollar": "United States Dollar",
        "chinese-yuan": "Chinese Yuan",
        "euro": "Euro",
        "czk-koruna": "Czech Koruna",
        "british-pound": "British Pound",
        "japanese-yen": "Japanese Yen",
        "bitcoin": "Bitcoin",

        /**********************
        * Wallet Manager Page *
        ***********************/
        "wallet-manager-intro": "Wallets will have individual settings, you can check the options of each wallet below.",
        "wallet-manager-add-wallet": "Add Wallet",

        /********************************************** Coin Screens ***********************************************/

        /*****************
        * Coin Home Page *
        ******************/
        "coin-overview": "{{coinName}} Overview",
        "coin-new-transactions-today": "{{ todaysTransactions }} NEW TRANSACTIONS TODAY",
        "coin-balance": "Balance",
        "coin-action-recharge": "TRANSFER",
        "coin-action-withdraw": "TRANSFER",
        "coin-action-send": "SEND",
        "coin-action-receive": "RECEIVE",
        "coin-transactions": "Transactions",
        "coin-internal-transactions": "Internal Transactions",
        "coin-no-transactions": "No transactions",
        "coin-op-received-token": "Received",
        "coin-op-sent-token": "Sent",
        "coin-op-transfered-token": "Transferred",
        "coin-op-vote": "Vote",
        "coin-op-identity": "Identity publication",
        "coin-op-contract-create": "Contract Creation",
        "coin-op-contract-token-transfer": "ERC20 Token Transfer",
        "coin-op-contract-call": "Contract Call",
        "coin-op-contract-destroy": "Invalid Transaction",
        "coin-op-producer-register": "DPOS Node Registration",
        "coin-op-producer-cancel": "DPOS Node Cancellation",
        "coin-op-producer-update": "DPOS Node Update",
        "coin-op-producer-return": "DPOS Node Registration",
        "coin-op-cr-register": "CR Registration",
        "coin-op-cr-cancel": "CR Cancellation",
        "coin-op-cr-update": "CR Update",
        "coin-op-cr-return": "CR Deposit Retrieve",
        "coin-op-proposal": "New Proposal",
        "coin-op-proposal-review": "Review Proposal",
        "coin-op-proposal-tracking": "Proposal Tracking",
        "coin-op-proposal-withdraw": "Proposal Fund Withdrawal",
        "coin-op-crc-claim": "CR Council Member Transaction",
        "coin-dir-from-mainchain": "From Main Chain",
        "coin-dir-from-idchain": "From EID Sidechain",
        "coin-dir-from-ethsc": "From ESC Sidechain",
        "coin-dir-to-mainchain": "To Main Chain",
        "coin-dir-to-idchain": "To EID Sidechain",
        "coin-dir-to-ethsc": "To ESC Sidechain",
        "coin-transaction-status-confirmed": "Confirmed",
        "coin-transaction-status-pending": "Pending",
        "coin-transaction-status-unconfirmed": "Unconfirmed",
        "coin-transaction-status-not-published": "Not published",
        "text-coin-close-warning": "Token will be removed from the list.",

        /*******************
        * Coin Select Page *
        ********************/
        "coin-select-title": "Select Coin",

        /*********************
        * Coin Transfer Page *
        **********************/
        "coin-transfer-send-title": "Send money",
        "coin-transfer-recharge-title": "Money transfer",
        "coin-transfer-withdraw-title": "Money transfer",
        "payment-title": 'Payment',
        "transfer-from": "Transfer from",
        "transfer-to": "Transfer to",
        "transfer-amount": "Transfer amount",
        "transfer-receiver-address": "Receiver address",
        "transfer-send-ela": "Send ELA",
        "balance": "Balance",
        "balance-remaining": "Balance Remaining:",
        "insufficient-balance": "Insufficient Balance",
        "transfer-all": "All",
        "max": "MAX",
        "touch-to-select-a-personal-wallet": "Touch to select a personal wallet",
        "withdraw-note": "The minimum withdrawal amount is 0.0002 ELA and must be an integral multiple of 0.00000001",
        'crosschain-note': "Elastos cross-chain transfers usually take between 15 and 25 minutes. During this time you will not see your funds, please be patient",
        "balance-locked": "( {{ locked }} locked )",

        /********************
        * Coin Receive Page *
        *********************/
        "coin-receive-title": "Receive {{coinName}}",
        "coin-receive-ela-address": "Your {{coinName}} Address",
        "coin-receive-tap-to-copy": "Tap address to copy",
        "coin-address-copied": "{{coinName}} address copied!",
        "coin-receive-address-list": "Enter Address List",

        /********************
        * Coin Address Page *
        *********************/
        "coin-address-msg": "Available Addresses",
        'coin-address-load-more': 'Loading...',
        "coin-address-load-finish": 'All addresses listed',

        /*********************
        * Contacts Component *
        **********************/
        "select-address": "Select Address",
        "cryptonames": "Cryptonames",

        /*******************************
        * Confirm Transaction Component *
        ********************************/
        "confirm-transaction-title": "Confirm Transaction",
        "transfer-transaction-type": "Transfer Transaction",
        "send-transaction-type": "Send Transaction",

        /***********************************
        * Transaction Successful Component *
        ************************************/
        'tx-success': "Transaction Successful",

        /***********************************
        * Options Component *
        ************************************/
        'paste': "Paste",
        'contacts': "Contacts",
        'scan': "Scan",

        /***********************************
        * Network Switch Component *
        ************************************/
        'network-switch-component-title': 'Network switch',
        'network-switch-component-intro': 'To continue, you need to switch the currently active network to a different network.',
        'network-switch-component-confirm': 'Switch network',

        /************************
        * Transaction Info Page *
        *************************/
        "tx-info-title": "Transaction Details",
        "tx-info-confirmations": "Confirmations",
        "tx-info-transaction-time": "Transaction time",
        "tx-info-memo": "Memo",
        "tx-info-receiver-address": "Receiver address",
        "tx-info-sender-address": "Sender address",
        "tx-info-transaction-fees": "Transaction fees",
        "tx-info-cost": "Total Cost",
        "tx-info-transaction-id": "Transaction ID",
        "tx-info-block-id": "Block ID",
        "tx-info-type-received": "Received",
        "tx-info-type-sent": "Sent",
        "tx-info-type-transferred": "Transferred",
        "tx-info-token-address": "ERC20 Token Address",
        "tx-info-erc20-amount": "ERC20 Token Amount",

        /***********************************
        * ETH Transaction Component *
        ************************************/
        "eth-sending-transaction": "Transaction is sending",
        "eth-transaction-wait": "Please wait...",
        "eth-transaction-fail": "Transaction failed",
        "eth-transaction-pending": "Transaction not confirmed",
        "eth-transaction-speedup-prompt": "You can speedup the transaction by increasing the gas price",
        "eth-transaction-speedup": "Speedup",
        "eth-gasprice": "Gas Price(GWEI)",
        "eth-gaslimit": "Gas Limit",

        /**************************
        * Token chooser component *
        ***************************/

        'select-a-token': 'Select a token',
        'select-token-intro': 'Which token would you like to use next?',

        /**************************
        * Wallet chooser component *
        ***************************/

        'unsupported-on-network': 'Unsupported on the {{network}} network.',

        /*********************
        * Ledger Get Address Component *
        **********************/
        "ledger-account-select": "Please select a account from ledger",
        "ledger-connecting": "Searching Ledger Wallet",
        "ledger-prompt": "Please open Ledger Nano X, keep it unlocked, and open the {{appname}} application",

        /*******************
        * Ledger scan page *
        ********************/
        "ledger-scan": "Ledger Search",
        "ledger-scan-available-devices": "Available devices",
        "ledger-scan-scan-again": "Scan again",
        "ledger-scan-ledger-scanning": "Searching devices",
        "ledger-scan-bluetooth-not-enable": "Bluetooth is not turned on, please turn on Bluetooth first",
        "ledger-scan-open-bluetooth-setting": "Turn on Bluetooth settings",

        /**********************
        * Ledger connect page *
        ***********************/
        "ledger-connect": "Ledger Account",
        "ledger-device": "Device",
        "ledger-connect-error": "Failed to connect to the device",
        "ledger-connecting-to-device": "Connecting to device",
        "ledger-addresses": "Addresses",
        "ledger-address-type": "Address type",
        "ledger-pick-network": "Pick network",
        "ledger-connect-ledger-sucess": "Connected ledger hardware wallet",

        /********************************************** Wallet Settings Screens ***********************************************/

        /***********************
        * Wallet Settings Page *
        ************************/
        "wallet-settings-title": "Wallet Settings",
        "wallet-settings-backup-wallet": "Backup Wallet",
        "wallet-settings-backup-wallet-subtitle": "View mnemonics to export and backup",
        "wallet-settings-backup-wallet-export": "Export mnemonic and private key",
        "wallet-settings-backup-wallet-keystore": "Export Keystore",
        "wallet-settings-change-name": "Change Name",
        "wallet-settings-change-name-subtitle": "Organize your wallet with a custom name",
        "wallet-settings-change-theme": "Change Theme",
        "wallet-settings-change-theme-subtitle": "Organize your wallet with a custom color",
        "wallet-settings-manage-coin-list": "Manage Coin List",
        "wallet-settings-manage-coin-list-subtitle": "Check which coins to display",
        "wallet-settings-delete-wallet": "Delete Wallet",
        "wallet-settings-delete-wallet-subtitle": "This will not delete your assets, you can always import this wallet again",
        "wallet-settings-migrate-did1": "Transfer DID 1.0 funds",
        "wallet-settings-migrate-did1-subtitle": "Transfer remaining ELA from the deprecated 1.0 DID sidechain back to the main chain",
        "wallet-settings-migrate-did1-intro": "This is a one time operation. This transfer will migrate all your remaining funds from the now deprecated DID 1.0 Elastos sidechain to the Elastos mainchain. After that, the DID 1.0 subwallet will disappear from your wallet.",
        "delete-wallet-confirm-title": "Delete Wallet",
        "delete-wallet-confirm-subtitle": "Your wallet will be deleted from this device. You can re-import it later but make sure to backup your mnemonics first.",
        "wallet-settings-consolidate-utxos": "Consolidate",
        "wallet-settings-consolidate-utxos-subtitle": "Too many utxos will increase the time to create transactions.",
        "wallet-settings-consolidate-no-need": "No need to Consolidate",
        "wallet-settings-extended-public-keys-title": "Extended public keys",
        "wallet-settings-extended-public-keys-subtitle": "Special keys required to create multi-signature wallets",

        /************************
        * Wallet Edit Name Page *
        *************************/
        "wallet-edit-name-title": "Change Wallet Name",
        "wallet-edit-name-new-name": "Enter new name",

        /***************************
        * Wallet Change Theme Page *
        ****************************/
        "change-wallet-theme-title": "Change Wallet Theme",

        /************************
        * Wallet Coin List Page *
        *************************/
        "coin-list-title": "Manage Coin List",
        "coin-list-enable-disable-coins": "Enable/Disable Coins",
        "coin-list-enable-disable-coins-intro": "Toggle what coins you would like to display on your wallet home screen.",
        "erc-20-token": "ERC20 Token",
        "new-coins": "New Coins",
        "all-coins": "All Coins",
        "search-coin": "Search Coins",

        /***********************
        * Export Mnemonic Page *
        ************************/
        'text-export-mnemonic': 'Export Mnemonic',

        /***********************
        * ERC20 Details Page *
        ************************/
        'coin-erc20-details-address': 'Contract Address',
        'coin-erc20-details-share': 'Share',
        'coin-erc20-details-delete': 'Delete',
        'delete-coin-confirm-title': 'Delete Coin',
        'delete-coin-confirm-subtitle': 'This coin will be removed from your wallet but your coin balance will remain safe. To utilize and see your coin balance, you would have to re-add this coin again.',

        /*****************
        * Add ERC20 Page *
        ******************/
        "coin-adderc20-title": "Add ERC20 Token",
        "coin-adderc20-intro": 'Manually enter the token address,',
        "coin-adderc20-intro2": 'or scan its QR code.',
        "coin-adderc20-enteraddress": 'Enter token address',
        "coin-adderc20-add": 'Add Token',
        "coin-adderc20-search": 'Search Token',
        "coin-adderc20-name": 'Token Name',
        "coin-adderc20-symbol": 'Token Symbol',
        "coin-adderc20-not-a-erc20-contract": "The provided ERC20 token address is not valid.",
        "coin-adderc20-invalid-contract-or-network-error": "The provided ERC20 token address is not valid or there is a network error.",
        'coin-adderc20-alreadyadded': 'Token already added',
        'coin-adderc20-not-found': "The token address can't be found, please check it!",

        /***********************
        * Manage networks Page *
        ************************/
        'manage-networks-title': 'Manage networks',
        'manage-networks-intro': 'Select networks that you want to see in networks list. Hide networks that you don\'t use. You can also add custom ethereum-compatible networks from the plus icon above.',

        /***********************
        * Custom networks Page *
        ************************/
        'custom-networks-title': 'Custom networks',
        'add-custom-network-title': 'Add custom network',
        'edit-custom-network-title': 'Edit custom network',
        'custom-networks-intro': 'Manage your own EVM compatible networks.',
        'add-custom-network': '+ Add custom network',
        'network-name': 'Name',
        'network-rpc-url': 'RPC URL',
        'network-account-rpc-url': 'Account RPC URL (optional)',
        'network-chain-id': 'Chain ID',
        'network-token-symbol': 'Token Symbol (optional)',
        'checking-rpc-url': 'Checking RPC URL',
        'checking-account-rpc-url': 'Checking account RPC URL',
        'wrong-rpc-url': 'The RPC URL could not be reached and could be wrong, please check it.',
        'wrong-account-rpc-url': 'The account RPC URL could not be reached and could be wrong, please check it.',
        'cant-delete-active-network': 'The active network can\'t be deleted. Please first change the current network.',
        'delete-network-prompt-title': 'Delete network ?',
        'delete-network-prompt-text': 'Do you really want to delete this network ?',

        /***********************
        * Asset Overview Page *
        ************************/
        'wallet-asset-title': 'Assets Overview',
        "wallet-asset-networks-count": "{{ networksCount }} Networks",
        'staked-assets-info-by': 'Staked assets information provided by',

        /************
        * NFT pages *
        *************/
        'nft-overview': 'NFT Overview',
        'nft-assets': 'Assets',
        'nft-token-id': 'Token ID',
        'nft-collectibles-cant-be-listed': 'Collectibles for this NFT type cannot be listed.',
        'nft-unnamed-asset': 'Unnamed Asset',
        'nft-asset-with-type': '{{ type }} NFT asset',
        'nft-properties': 'Properties',
        'nft-no-properties-yet': 'Properties display is not available yet. Coming soon.',
        'nft-assets-owned': 'assets owned',
        'nft-attributes': 'Attributes',

        /********************************************** Intent Screens ***********************************************/

        /************************
        * Select Subwallet Page *
        *************************/
        'select-subwallet': 'Select Subwallet',
        'select-wallet': 'Select wallet',

        /**************
        * Access Page *
        ***************/
        "access-title": "Wallet Access",
        "access-subtitle-wallet-access-from": "Wallet Access from:",
        "access-subtitle-access-mnemonic-from": "Access Mnemonic from:",
        "access-request-for-info": "This is a request for information from your wallet.",
        "access-reason": "Reason",
        "access-data-access": "Data Access",
        'access-mnemonic': 'Request Mnemonic',
        'elaaddress': 'ELA Address',
        'elaamount': 'ELA Balance',
        'ethaddress': 'ESC Address',
        'requester': 'Request from',
        'text-allow': 'Allow',
        'text-warning': 'Warning',
        'text-share-mnemonic-warning': 'Mnemonic is the only proof of blockchain assets. Please confirm that there is no risk of leakage before sharing!',

        /***********************
        * DID Transaction Page *
        ************************/
        "didtransaction-title": "Publish Identity",
        "didtransaction-publish-identity": "Publish Identity",
        "didtransaction-transaction-fee": "This will cost a minor transaction fee",
        "didtransaction-intro": "You are publishing your latest identity changes to the public EID Sidechain.",

        /*******************
        * Voting Common *
        ********************/
        "vote-you-are-voting": "You are Voting!",
        "vote-transaction-fees": "0.0001 ELA transaction fee will be charged",
        "vote-revote": "Don't forget to re-vote when you spend any ELA from your main ELA wallet",

        /*******************
        * DPoS Voting Page *
        ********************/
        "dposvote-title": "Vote for Supernodes",
        "dposvote-voting-for": "You are voting for:",
        "dposvote-with": "With:",

        /***********************
        * CRCrouncil Voting Transaction Page *
        ************************/
        "crcouncilvote-title": "Vote for CR Council",
        "crcouncilvote-voting-with": "You are voting with:",

        /***********************
        * ESC Transaction Page *
        ************************/
        "esctransaction-title": "Transaction",
        "esctransaction-smart-contract": "Smart Contract",
        "esctransaction-intro": "You are going to sign and run a smart contract.",
        "esctransaction-approve-token": "Approve Token",
        "esctransaction-approve-token-intro": "This application or website will be allowed to withdraw and spend your {{token}} tokens on your behalf.",
        "esctransaction-you-are-using": "You are using:",
        "esctransaction-value": "Value:",
        "esctransaction-fees": "Estimated Max Fee:",

        /***********************
        * Sign Typed Data Page *
        ************************/
        "signtypeddata-title": "Sign data",
        "signtypeddata-subtitle": "Sign data",
        "signtypeddata-intro": "The calling application requires you to sign some data with your wallet in order to continue. Please confirm.",
        "signtypeddata-danger": "Signing this message can be dangerous. This signature could potentially perform any operation on your account's behalf, including granting complete control of your account and all of its assets to the requesting site. Only sign this message if you know what you're doing or completely trust the requesting site.",

        /***********************
        * No Wallet *
        ************************/
        "intent-no-wallet-title": "No Wallet",
        "intent-no-wallet-msg": "Looks like you don't have a wallet. Please create one before trying again",

        /********************************************** Create Wallet Screens ***********************************************/

        /****************
        * Launcher Page *
        *****************/
        'wallet-prompt1': 'Your Secure',
        'wallet-prompt2': 'Digital Wallet',
        'get-started': 'Get Started',
        'import-wallet-msg': 'Already got a Wallet? Import it.',
        'launcher-create-wallet': 'Create Wallet',
        'new-standard-wallet': 'New standard wallet',
        'import-standard-wallet': 'Import standard wallet',
        'multi-sig-wallet': 'Multi-sig wallet',
        'ledger-hardware-wallet': 'Ledger Nano X hardware wallet',

        /*********************
        * Wallet Create Page *
        **********************/
        'enter-wallet-name': 'Please enter a wallet name',
        'single-address': 'Single-Address Wallet',
        'multiple-address': 'Multi-Address Wallet',
        'use-passphrase': 'Enable Passphrase',
        'not-use-passphrase': 'Disable Passphrase',
        'launcher-backup-import': 'Import Wallet',
        "text-wallet-name-validator-enter-name": "Please enter a name for your wallet",
        "text-wallet-name-validator-not-valid-name": "Sorry, this is not a valid wallet name",
        "text-wallet-name-validator-already-exists": "This wallet name is already in use",
        "text-wallet-passphrase-validator-repeat": "The two input mnemonic passphrases are inconsistent",
        "text-wallet-passphrase-validator-min-length": "The mnemonic passphrase must be at least 8 characters",
        "import-wallet-by-mnemonic": "Import Wallet by mnemonic",
        "import-wallet-by-privatekey": "Import Wallet by private key or Keystore",

        /*****************
        * Mnemonic Pages *
        *****************/
        'mnemonic-prompt1': 'These are your 12 security words (mnemonic phrase). Lose these and you will lose the wallet, so you must keep them written down ',
        'mnemonic-prompt2': 'in order',
        'mnemonic-prompt3': ', and safe!',
        'back-to-setting': 'Back to Settings',
        'view-mnemonic': "View Mnemonic",
        'mnemonic-warning1': 'Keep it secret,',
        'mnemonic-warning2': 'Keep it safe!',
        'mnemonic-warning3': 'Never share your mnemonic phrase with anyone and always keep it safe! Make sure no one is watching you and click below.',
        'type-menmonic-verify': 'Please type your 12 security words (mnemonic phrase) in order to verify it.',
        'type-menmonic-import': 'Type your mnemonic sequence of words to import your wallet. ',
        'import-text-word-sucess': 'Wallet imported from Mnemonics',
        'next-four-words': 'Next 4 words',
        'create-wallet': 'Create Wallet',
        'import-wallet': 'Import Wallet',
        "mnemonic-import-missing-words": "Please fill in all inputs before proceeding",
        "mnemonic-check-title": "Mnemonic Verification",
        "memory-written-down": "I have written it down",
        "mnemonic-verify-sucess": "Mnemonic phrase verification succeeded",
        "mnemonic-verify-fail": "Mnemonic phrase verification failed, please re-enter the mnemonic phrase",
        "mnemonic-input-passphrase": "Enter mnemonic passphrase",
        "mnemonic-reinput-passphrase": "Repeat mnemonic passphrase",
        "help:create-password": "The mnemonic passphrase is optional but it gives an additional level of security to your wallet. You can consider it as a custom 13th mnemonic word. Please note that this passphrase can never be recovered if you forget it. Entering a wrong passphrase when restoring your wallet in the future will not generate any error, but will result in a wrong wallet address.",
        "help:import-password": "A mnemonic passphrase is a custom password that's bound to your mnemonic words. If you did not create a mnemonic passphrase when you created your wallet, then please disregard.",
        // "help:mnemonic-password": 'This is an optional password bound to your mnemonic words, to give your wallet extra security. Save it carefully, it is NOT recoverable if lost.',
        "privatekey-tap-to-copy": "Tap private key to copy",
        "export-private-key-intro": "Optionally, you can also use the following private key in some wallets. Touch to copy.",
        "import-paste-from-keypad": "Note: you can paste a whole mnemonic sentence from the keypad",

        /***********************
        * Export Keystore Page *
        ************************/
        "keystore-title": "Export Keystore",
        "keystore-export-intro": "Touch to copy",
        "keystore-input-password": "Set Keystore password",
        "keystore-reinput-password": "Repeat Keystore password",
        "keystore-export": "Export",
        "keystore-password-validator-repeat": "The two input passwords are inconsistent",
        "keystore-password-validator-min-length": "The password must be at least 8 characters",

        /********************************
        * Advanced Mnemonic Import Page *
        *********************************/
        'advanced-import': 'Fast mnemonic input',
        'advanced-import-intro': 'You can paste and enter your 12 mnemonic phrases in one line.',
        'advanced-import-msg': '* Spaces are required between words',
        'paste-mnemonic': 'Paste or Enter 12 Mnemonics',

        /********************************
        * Import Wallet by private key Page *
        *********************************/
        'import-wallet-by-privatekey-info': 'Private key: Only EVM compatible wallet private keys are supported',
        'import-wallet-by-keystore-info': 'Keystore: Only ELA keystore is supported',
        'paste-privatekey': 'Paste or Enter Private Key or Keystore',
        'wrong-privatekey-msg': 'Please enter the correct private key',
        'import-private-key-sucess': 'Wallet imported from Private key',
        'import-keystore-sucess': 'Wallet imported from keystore',
        'keystore-backup-password': 'Please enter the keystore password',

        /***************************
        * Earn, Swap, Bridge pages *
        ****************************/
        'view-transactions': 'Transactions & Transfers',
        'earn': 'Earn',
        'swap': 'Swap',
        'bridge': 'Bridge',
        'wallet-coin-earn-title': 'Earn Providers',
        'wallet-coin-swap-title': 'Swap Providers',
        'wallet-coin-bridge-title': 'Bridge Providers',
        'providers-disclaimer': 'Services listed on this page are <b>third party services that are not related to Elastos Essentials</b>. Do your own verifications before trusting any platform.',
        'finance-platforms': 'Finance Platforms',
        'finance-platforms-intro': 'The following platforms can manage this coin to let you earn interests.',
        'get-more-tokens': 'Get More Tokens',
        'get-more-tokens-intro': 'The following third party swap services are available to <b>get more {{coinName}} tokens</b>:',
        'bridge-tokens': 'Bridge your tokens',
        'bridge-tokens-intro': 'The following third party bridge services are available to <b>transfer {{coinName}}</b> tokens from and to {{networkName}}:',
        'to-networks': 'To networks:',

        /********************************
        * Multisig standard wallet page *
        *********************************/

        'multi-sig-wallet-name': 'Wallet name',
        'multi-sig-my-signing-wallet': 'My signing wallet',
        'multi-sig-pick-a-wallet': 'Pick a wallet',
        'multi-sig-other-co-signers': 'Other cosigners',
        'multi-sig-add-cosigner': 'Add a cosigner',
        'multi-sig-total-signers': 'Total signers',
        'multi-sig-required-signers': 'Required signers',
        'multi-sig-new-wallet-title': 'New multi-sig wallet',
        'multi-sig-error-no-signing-wallet': "Please choose your signing wallet",
        'multi-sig-error-invalid-xpub': 'Please input a valid xpub key',
        'multi-sig-error-xpub-in-user': 'This key is already in the list, no duplicates can be used',

        /********************************
        * Multisig tx details component *
        *********************************/
        'multi-signature-status': 'Multi signature status',
        'multi-signature-my-signature': 'My signature',
        'multi-signature-sign': 'Sign',
        'multi-signature-signed': 'Signed',
        'multi-signature-not-signed': 'Not signed',
        'multi-signature-publish': 'Publish',
        'multi-signature-transaction-link': 'Co-signers link',
        'multi-signature-transaction-link-copy-info': 'Copy this link to let other co-signers find and sign this transaction',
        'multi-signature-transaction-link-copied': 'Transaction link copied to clipboard',

        /***************************
        * Multisig tx intent page  *
        ****************************/
        'multi-sig-tx-title': 'Multisig transaction',
        'multi-sig-tx-fetching': 'Fetching transaction information, please wait.',
        'multi-sig-tx-no-tx-found': 'Sorry, no matching transaction was found.',
        'multi-sig-tx-unknown-network': 'Sorry, This transaction is for a network that doesn\'t exist in your version of Essentials.',
        'multi-sig-tx-pick-wallet': 'Pick the right multi-signature wallet to use.',
        'multi-sig-tx-select-wallet': 'Select multi-sig wallet',
        'multi-sig-tx-selected-wallet': 'Selected wallet',
        'multi-sig-tx-switched-to-network': 'Switched to {{ network }}',

        /***************************
        * Multisig extended public key page  *
        ****************************/
        'multi-sig-extended-public-key-title': 'Extended public key',
        'multi-sig-extended-public-key-copied': 'Extended public keys copied to clipboard',
        'multi-sig-extended-public-key-info': 'Here is your extended public key. You can use this key as a co-signer key for multi-signature wallets.',
        'multi-sig-extended-public-key-copy': 'Tap the key to copy',
        'multi-sig-extended-public-key-note': 'Technical note',
        'multi-sig-extended-public-key-note-info': 'This extended public key is derived using BIP45 in order to be used in a multi-signature wallet, while your elastos mainchain wallet is BIP44 for historical reasons.',

        /************************
        * Offline transactions  *
        *************************/

        'offline-tx-pending-multisig': 'Pending multi-signature',
        'offline-tx-unknown-tx': "Unknown transaction",

        /*****************************
        * Extended transaction info  *
        ******************************/
        'ext-tx-info-type-send-erc1155-nft': 'Send NFT',
        'ext-tx-info-type-send-erc20': 'Send {{ symbol }}',
        'ext-tx-info-type-send-tokens': 'Send tokens',
        'ext-tx-info-type-swap-erc20': '{{ fromSymbol }} → {{ toSymbol }}',
        'ext-tx-info-type-swap-tokens': 'Swap tokens',
        'ext-tx-info-type-approve-token': 'Approve token',
        'ext-tx-info-type-approve-erc20': 'Approve {{ symbol }}',
        'ext-tx-info-type-bridge-tokens': 'Bridge tokens',
        'ext-tx-info-type-bridge-erc20': 'Bridge {{ symbol }}',
        'ext-tx-info-type-liquidity-deposit': 'Liquidity deposit',
        'ext-tx-info-type-add-liquidity-with-symbols': 'Add {{ symbolA }} + {{ symbolB }} LP',
        'ext-tx-info-type-remove-liquidity': 'Remove liquidity',
        'ext-tx-info-type-remove-liquidity-with-symbols': 'Remove {{ symbolA }} + {{ symbolB }} LP',
        'ext-tx-info-type-withdraw': 'Withdraw',
        'ext-tx-info-type-get-rewards': 'Get rewards',
        'ext-tx-info-type-get-booster-rewards': 'Get booster rewards',
        'ext-tx-info-type-deposit': 'Deposit',
        'ext-tx-info-type-stake': 'Stake',
        'ext-tx-info-type-mint': 'Mint',
        'ext-tx-info-type-redeem': 'Redeem',
        'ext-tx-info-type-lock': 'Lock',
        'ext-tx-info-type-claim-tokens': 'Claim tokens',
        'ext-tx-info-type-withdraw-to-mainchain': 'To Main Chain',

        /***************************
        * Migrator *
        ****************************/
        'migrator-title': 'Update required',
        'migrator-info': 'We need to update a few things before you can continue.',
        'migrator-ongoing': 'On going operation: ',
        'migrator-success': 'All good, please touch to continue!',
        'migrator-fail': 'Unfortunately the update has failed. Please let the team know about this.',
        'migrator-start': 'Start',

        /********************************************** Error ***********************************************/

        // Consolidate
        'text-consolidate-prompt': 'Consolidate?',
        'text-consolidate-UTXO-counts': 'Number of UTXOs: {{ count }}',
        'text-consolidate-note': 'Too many UTXOs may cause some transactions to fail, and the consolidation will not affect existing supernodes voting',
        'reasons-failure': 'Reason for failure',
        "notification-too-many-utxos": "The number of UTXOs in ELA mainchain of wallet {{ walletname }} has reached {{ count }}. It is recommended that you re execute dpos voting or consolidate UTXOs!",

        // Error codes
        'Error-10000': 'JSON parse error of action parameters',
        'Error-10001': 'Parameters error of action',
        'Error-10002': 'Invalid master wallet',
        'Error-10003': 'Invalid sub wallet',
        'Error-10004': 'Create master wallet error',
        'Error-10005': 'Create sub wallet error',
        'Error-10006': 'Recover sub wallet error',
        'Error-10007': 'Invalid master wallet manager',
        'Error-10008': 'Import wallet with keystore error',
        'Error-10009': 'Import wallet with mnemonic error',
        'Error-10010': 'Instance of sub wallet error',
        'Error-10011': 'Invalid DID manager',
        'Error-10012': 'Invalid DID',
        'Error-10013': 'Invalid action',
        'Error-20000': 'SPV other exception',
        'Error-20001': 'Invalid parameters',
        'Error-20002': 'Invalid password',
        'Error-20003': 'Wrong password',
        'Error-20004': 'ID not found',
        'Error-20005': 'Create master wallet error, the wallet already exists',
        'Error-20006': 'Create sub wallet error',
        'Error-20007': 'Parse JSON array error',
        'Error-20008': 'Invalid mnemonic',
        'Error-20009': 'Public key format error',
        'Error-20010': 'Public key length error',
        'Error-20011': 'Side chain deposit parameters error',
        'Error-20012': 'Side chain withdraw parameters error',
        'Error-20013': 'Tx size too large',
        'Error-20014': 'Create tx error',
        'Error-20015': 'Invalid tx',
        'Error-20016': 'Path do not exist',
        'Error-20017': 'Register ID payload error',
        'Error-20018': 'Sqlite error',
        'Error-20019': 'Derive purpose error',
        'Error-20020': 'Wrong account type',
        'Error-20021': 'Wrong net type',
        'Error-20022': 'Invalid coin type',
        'Error-20023': 'No current multi sign account',
        'Error-20024': 'Cosigner count error',
        'Error-20025': 'Multi sign error',
        'Error-20026': 'Key store error',
        'Error-20027': 'Limit gap error',
        'Error-20028': 'Wallet error',
        'Error-20029': 'Key error',
        'Error-20030': 'Hex to string error',
        'Error-20031': 'Sign type error',
        'Error-20032': 'Address error',
        'Error-20033': 'Sign error',
        'Error-20034': 'Keystore requires password',
        'Error-20035': 'Balance is not enough',
        'Error-20036': 'JSON format error',
        'Error-20037': 'Invalid vote stake',
        'Error-20038': 'Invalid input',
        'Error-20039': 'Invalid transaction',
        'Error-20040': 'Get internal address fail',
        'Error-20041': 'Account not support vote',
        'Error-20042': 'Local tx do not belong to wallet',
        'Error-20043': 'Deposit amount is insufficient',
        'Error-20044': 'PrivateKey Not Found',
        'Error-20045': 'Invalid Redeem Script',
        'Error-20046': 'Already Signed',
        'Error-20047': 'Encrypt Error',
        'Error-20048': 'Verify Error',
        'Error-20049': 'There is already an on going transaction. Please wait for the transaction to be confirmed.',
        'Error-20050': 'Number of mnemonic words wrong',
        'Error-20051': 'Invalid Local Store',
        'Error-20052': 'Master Wallet Not Exist',
        'Error-20053': 'Invalid Asset',
        'Error-20054': 'Reading configuration file error',
        'Error-20055': 'The chain ID is invalid.',
        'Error-20056': 'UnSupport Old Transaction Type',
        'Error-20057': 'Unsupport Operation',
        'Error-20058': 'BigInt',
        'Error-20059': 'The deposit is not found',
        'Error-20060': 'Too much inputs',
        'Error-20061': 'Last vote is being confirmed',
        'Error-20062': 'Prosocal content is too large',
        'Error-20063': 'The hash value of the proposal does not match',
        'Error-29999': 'Other error',
        'Error-30000': 'JSON Conversion error',
        'Error-31000': 'Invalid Unit type',
        'Error-32000': 'Invalid Ethereum address',
        'transaction-type-0': 'CoinBase',
        'transaction-type-1': 'RegisterAsse',
        'transaction-type-2': 'TransferAsset',
        'transaction-type-3': 'Record',
        'transaction-type-4': 'Deploy',
        'transaction-type-5': 'SideChainPow',
        'transaction-type-6': 'RechargeToSideChain',
        'transaction-type-7': 'WithdrawFromSideChain',
        'transaction-type-8': 'TransferCrossChainAsset',
        'transaction-type-9': 'RegisterProducer',
        'transaction-type-10': 'CanCelProducer',
        'transaction-type-11': 'UpdateProducer',
        'transaction-type-12': 'ReturnDepositCoin',
        'transaction-type-13': 'Unknown Type',
        'transaction-type-vote': 'Vote Transaction',
        'transaction-type-did': 'DID Transaction',
        'transaction-type': 'Transaction Type',
        'transaction-deleted': 'Deleted',
        'txPublished-0': 'Successful Trade',
        'txPublished-1': 'Malformed Transaction',
        'txPublished-16': 'Invalid Transaction',
        'txPublished-17': 'Obsolete Transaction',
        'txPublished-18': 'Successful Trade',
        'txPublished-22': 'Transaction Not Signed',
        'txPublished-64': 'Nonstandard Transaction',
        'txPublished-65': 'Dust Transaction',
        'txPublished-66': 'Insufficient Fee',
        'txPublished-67': 'Checkpoint Error',

        'did-oversize': 'DID Over Size',
    },

    /*'Afghanistan': 'Afghanistan',
    'Albania': 'Albania',
    'Algeria': 'Algeria',
    'American Samoa': 'American Samoa',
    'Andorra': 'Andorra',
    'Angola': 'Angola',
    'Anguilla': 'Anguilla',
    'Antarctica': 'Antarctica',
    'Antigua and Barbuda': 'Antigua and Barbuda',
    'Argentina': 'Argentina',
    'Armenia': 'Armenia',
    'Aruba': 'Aruba',
    'Australia': 'Australia',
    'Austria': 'Austria',
    'Azerbaijan': 'Azerbaijan',
    'Bahamas': 'Bahamas',
    'Bahrain': 'Bahrain',
    'Bangladesh': 'Bangladesh',
    'Barbados': 'Barbados',
    'Belarus': 'Belarus',
    'Belgium': 'Belgium',
    'Belize': 'Belize',
    'Benin': 'Benin',
    'Bermuda': 'Bermuda',
    'Bhutan': 'Bhutan',
    'Bolivia': 'Bolivia',
    'Bosnia and Herzegovina': 'Bosnia and Herzegovina',
    'Botswana': 'Botswana',
    'Brazil': 'Brazil',
    'British Indian Ocean Territory': 'British Indian Ocean Territory',
    'Brunei Darussalam': 'Brunei Darussalam',
    'Bulgaria': 'Bulgaria',
    'Burkina Faso': 'Burkina Faso',
    'Burundi': 'Burundi',
    'Cambodia': 'Cambodia',
    'Cameroon': 'Cameroon',
    'Canada': 'Canada',
    'Cape Verde': 'Cape Verde',
    'Cayman Islands': 'Cayman Islands',
    'Central African Republic': 'Central African Republic',
    'Chad': 'Chad',
    'Chile': 'Chile',
    'China': 'China',
    'Christmas Island': 'Christmas Island',
    'Cocos (Keeling) Islands': 'Cocos (Keeling) Islands',
    'Colombia': 'Colombia',
    'Comoros': 'Comoros',
    'Congo': 'Congo',
    'Congo, The Democratic Republic Of The': 'Congo, The Democratic Republic Of The',
    'Cook Islands': 'Cook Islands',
    'Costa Rica': 'Costa Rica',
    "Cote D'Ivoire": "Cote D'Ivoire",
    'Croatia (local name: Hrvatska)': 'Croatia (local name: Hrvatska)',
    'Cuba': 'Cuba',
    'Cyprus': 'Cyprus',
    'Czech Republic': 'Czech Republic',
    'Denmark': 'Denmark',
    'Djibouti': 'Djibouti',
    'Dominica': 'Dominica',
    'Dominican Republic': 'Dominican Republic',
    'East Timor': 'East Timor',
    'Ecuador': 'Ecuador',
    'Egypt': 'Egypt',
    'El Salvador': 'El Salvador',
    'Equatorial Guinea': 'Equatorial Guinea',
    'Eritrea': 'Eritrea',
    'Estonia': 'Estonia',
    'Ethiopia': 'Ethiopia',
    'Falkland Islands (Malvinas)': 'Falkland Islands (Malvinas)',
    'Faroe Islands': 'Faroe Islands',
    'Fiji': 'Fiji',
    'Finland': 'Finland',
    'France': 'France',
    'France Metropolitan': 'France Metropolitan',
    'French Guiana': 'French Guiana',
    'French Polynesia': 'French Polynesia',
    'Gabon': 'Gabon',
    'Gambia': 'Gambia',
    'Georgia': 'Georgia',
    'Germany': 'Germany',
    'Ghana': 'Ghana',
    'Gibraltar': 'Gibraltar',
    'Greece': 'Greece',
    'Greenland': 'Greenland',
    'Grenada': 'Grenada',
    'Guadeloupe': 'Guadeloupe',
    'Guam': 'Guam',
    'Guatemala': 'Guatemala',
    'Guinea': 'Guinea',
    'Guinea-Bissau': 'Guinea-Bissau',
    'Guyana': 'Guyana',
    'Haiti': 'Haiti',
    'Honduras': 'Honduras',
    'Hong Kong': 'Hong Kong',
    'Hungary': 'Hungary',
    'Iceland': 'Iceland',
    'India': 'India',
    'Indonesia': 'Indonesia',
    'Iran (Islamic Republic of)': 'Iran (Islamic Republic of)',
    'Iraq': 'Iraq',
    'Ireland': 'Ireland',
    'Israel': 'Israel',
    'Italy': 'Italy',
    'Jamaica': 'Jamaica',
    'Japan': 'Japan',
    'Jordan': 'Jordan',
    'Kazakhstan': 'Kazakhstan',
    'Kenya': 'Kenya',
    'Kuwait': 'Kuwait',
    'Kyrgyzstan': 'Kyrgyzstan',
    'Latvia': 'Latvia',
    'Lebanon': 'Lebanon',
    'Lesotho': 'Lesotho',
    'Liberia': 'Liberia',
    'Libyan Arab Jamahiriya': 'Libyan Arab Jamahiriya',
    'Liechtenstein': 'Liechtenstein',
    'Lithuania': 'Lithuania',
    'Luxembourg': 'Luxembourg',
    'Macau': 'Macau',
    'Madagascar': 'Madagascar',
    'Malawi': 'Malawi',
    'Malaysia': 'Malaysia',
    'Maldives': 'Maldives',
    'Mali': 'Mali',
    'Malta': 'Malta',
    'Marshall Islands': 'Marshall Islands',
    'Martinique': 'Martinique',
    'Mauritania': 'Mauritania',
    'Mauritius': 'Mauritius',
    'Mayotte': 'Mayotte',
    'Mexico': 'Mexico',
    'Micronesia': 'Micronesia',
    'Moldova': 'Moldova',
    'Monaco': 'Monaco',
    'Mongolia': 'Mongolia',
    'Montenegro': 'Montenegro',
    'Montserrat': 'Montserrat',
    'Morocco': 'Morocco',
    'Mozambique': 'Mozambique',
    'Myanmar': 'Myanmar',
    'Namibia': 'Namibia',
    'Nauru': 'Nauru',
    'Nepal': 'Nepal',
    'Netherlands': 'Netherlands',
    'Netherlands Antilles': 'Netherlands Antilles',
    'New Caledonia': 'New Caledonia',
    'New Zealand': 'New Zealand',
    'Nicaragua': 'Nicaragua',
    'Niger': 'Niger',
    'Nigeria': 'Nigeria',
    'Norfolk Island': 'Norfolk Island',
    'North Korea': 'North Korea',
    'Northern Mariana Islands': 'Northern Mariana Islands',
    'Norway': 'Norway',
    'Oman': 'Oman',
    'Pakistan': 'Pakistan',
    'Palau': 'Palau',
    'Palestine': 'Palestine',
    'Panama': 'Panama',
    'Papua New Guinea': 'Papua New Guinea',
    'Paraguay': 'Paraguay',
    'Peru': 'Peru',
    'Philippines': 'Philippines',
    'Pitcairn': 'Pitcairn',
    'Poland': 'Poland',
    'Portugal': 'Portugal',
    'Puerto Rico': 'Puerto Rico',
    'Qatar': 'Qatar',
    'Reunion': 'Reunion',
    'Romania': 'Romania',
    'Russian Federation': 'Russian Federation',
    'Rwanda': 'Rwanda',
    'Samoa': 'Samoa',
    'San Marino': 'San Marino',
    'Saudi Arabia': 'Saudi Arabia',
    'Senegal': 'Senegal',
    'Serbia': 'Serbia',
    'Seychelles': 'Seychelles',
    'Sierra Leone': 'Sierra Leone',
    'Singapore': 'Singapore',
    'Slovakia (Slovak Republic)': 'Slovakia (Slovak Republic)',
    'Slovenia': 'Slovenia',
    'Solomon Islands': 'Solomon Islands',
    'Somalia': 'Somalia',
    'South Africa': 'South Africa',
    'South Korea': 'South Korea',
    'Spain': 'Spain',
    'Sri Lanka': 'Sri Lanka',
    'Sudan': 'Sudan',
    'Suriname': 'Suriname',
    'Swaziland': 'Swaziland',
    'Sweden': 'Sweden',
    'Switzerland': 'Switzerland',
    'Syrian Arab Republic': 'Syrian Arab Republic',
    'Taiwan': 'Taiwan',
    'Tajikistan': 'Tajikistan',
    'Tanzania': 'Tanzania',
    'Thailand': 'Thailand',
    'Togo': 'Togo',
    'Tokelau': 'Tokelau',
    'Tonga': 'Tonga',
    'Trinidad and Tobago': 'Trinidad and Tobago',
    'Tunisia': 'Tunisia',
    'Turkey': 'Turkey',
    'Turkmenistan': 'Turkmenistan',
    'Turks and Caicos Islands': 'Turks and Caicos Islands',
    'Tuvalu': 'Tuvalu',
    'Uganda': 'Uganda',
    'Ukraine': 'Ukraine',
    'United Arab Emirates': 'United Arab Emirates',
    'United Kingdom': 'United Kingdom',
    'United States': 'United States',
    'Uruguay': 'Uruguay',
    'Uzbekistan': 'Uzbekistan',
    'Vanuatu': 'Vanuatu',
    'Vatican City State (Holy See)': 'Vatican City State (Holy See)',
    'Venezuela': 'Venezuela',
    'Vietnam': 'Vietnam',
    'Virgin Islands (British)': 'Virgin Islands (British)',
    'Virgin Islands (U.S.)': 'Virgin Islands (U.S.)',
    'Wallis And Futuna Islands': 'Wallis And Futuna Islands',
    'Western Sahara': 'Western Sahara',
    'Yemen': 'Yemen',
    'Zambia': 'Zambia',
    'Zimbabwe': 'Zimbabwe',
    'the Republic of Abkhazia': 'the Republic of Abkhazia',
    'the Republic of South Ossetia': 'the Republic of South Ossetia',
    'Bailiwick of Jersey': 'Bailiwick of Jersey',
    "Lao People's Democratic Republic": "Lao People's Democratic Republic",
    'The Republic of Macedonia': 'The Republic of Macedonia',
    'The Federation of Saint Kitts and Nevis': 'The Federation of Saint Kitts and Nevis',
    'Santa Luzia Island': 'Santa Luzia Island',
    'Saint Vincent and the Grenadines': 'Saint Vincent and the Grenadines',
    'Sao Tome and Principe': 'Sao Tome and Principe',
    'Saint-Martin': 'Saint-Martin',
    'The Republic of South Sudan': 'The Republic of South Sudan'*/
};


