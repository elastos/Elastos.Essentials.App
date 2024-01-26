export const fr = {

    'wallet': {
        /******************
        * Generic Actions *
        *******************/
        "send-to": "Envoyer à",
        "enter-name": "Saisir un nom",
        "enter-amount": "Saisie du montant",
        "total-amount": "MONTANT TOTAL",
        "advanced-options": "Options avancées",
        "recharge": "Recharger",
        "withdraw": "Transférer",
        "send": "Envoyer",
        "from": "De",
        "to": "Vers",
        "amount": "Montant",
        "exit": "Exit",
        'click-to-load-more': "Toucher pour voir davantage",
        'transaction-fail': 'Erreur de transaction',
        "confirmTitle": "Confirmez-vous?",
        "refresh-pulling-text": "Rafraîchir",
        "refresh-refreshing-text": "Mise à jour du portefeuille...",
        "intent-select-wallet": "Sélect. du portefeuille",
        "personal-wallets-with": "Portefeuille personnel avec {{ subwalletSymbol }}",
        "find-new-token": "Nouveau Jeton",
        "find-new-token-msg": "Nouveau jeton {{ token }} trouvé sur le réseau {{ network }}",
        "find-new-tokens-msg": "{{ count }} nouveaux jetons trouvés sur le réseau {{ network }}",
        "find-new-tokens-warning-msg": "Remarque : veuillez faire attention, certains jetons peuvent être malveillants. Ne les utilisez que si vous les connaissez.",
        "nft-name": "Nom",
        "nft-description": "Description",

        /*******************
        * Generic Messages *
        ********************/
        "copied": "Copié dans le presse-papier!",
        'text-did-balance-not-enough': "Enregistrer des informations sur la châine d'identité requièrt une faible somme d'ELA pour les frais de transactions. Veuillez d'abord transférer un petit montant (ex: 0,1 ELA) depuis votre portefeuille principal vers le portefeuille EID!",
        'amount-null': "Veuillez saisir un montant pour la transaction",
        "amount-invalid": "Veuillez saisir un montant valide",
        'eth-insuff-balance': 'Vous n\'avez pas suffisamment d\'{{ coinName }} pour payer cette transaction de jetons',
        "sync-completed": "Synchr. terminée",
        "not-a-valid-address": "Adresse invalide",
        "transaction-pending": "Une transaction est déjà en cours. Veuillez attendre la confirmation de la première transaction.",
        "transaction-invalid": "Transaction invalide, veuillez réessayer",
        "share-erc20-token": "Adresse de jeton ERC20 partagée",
        "privatekey": "Clé privée EVM",

        /************
        * Home Page *
        *************/
        "wallet-home-title": "Accueil Portefeuille",
        "wallet-overview": "Aperçu du Portefeuille",
        "you-have-n-wallets": "VOUS AVEZ {{walletsCount}} JETONS",
        "synced": "Synchronisé",
        "syncing": "Synchronisation",
        "synchronized": "Synchronisé {{progress}}%",
        "sync-progress": "Synchronisation {{progress}}%",
        "ela-erc20": "JETON ERC20 ELASTOS",
        "coin-list": "Liste des jetons",
        "staking-assets": "Actifs en exercice",
        "staking-assets-refresh": "Actualiser",
        "staking-assets-refreshing": "Actualisation",
        "activate-hive-vault": "Activer le stockage Hive",
        "pull-down-to-refresh": "Faire glisser l'écran pour rafraîchir",
        "hive-not-configured-title": "Stockage Hiv enon configuré",
        "hive-not-configured-text": "Votre espace de stockage Hive n'est pas configuré. Voulez-vous le configurer maintenant?",
        "hive-not-configured-not-now": "Pas maintenant",
        "hive-not-configured-configure": "Configurer",
        "collectibles": "Collections",
        "networks": "Réseaux",
        "choose-active-network": "Choix du réseau actif",
        "change-wallet": "Changer de portefeuille",
        "wallets": "Portefeuilles",
        "explore-your-wallets": "Explorez vos autres portefeuilles",
        "wallet-unsupported-on-network": "This wallet is unsupported on the {{ network }} network",
        "wallet-connect-to-ledger": "Please connect the Ledger Nano X",

        /********************************************** General Settings Screen ***********************************************/

        /****************
        * Settings Page *
        *****************/
        "settings-title": "Paramètres",
        "settings-general": "Général",
        "settings-add-wallet": "Ajouter un portefeuille",
        "settings-add-wallet-subtitle": "Créer ou importer un portefeuille",
        "settings-my-wallets": "Mes portefeuilles",
        "settings-my-wallets-subtitle": "Sauvegardez vos portefeuilles et accédez à leurs paramètres",
        "settings-currency": "Devise",
        "settings-currency-subtitle": "Selectionnez la devise à afficher",
        "settings-custom-networks": "Réseaux Personnalisés",
        "settings-custom-networks-subtitle": "Ajoutez et modifiez vos réseaux personnalisés ici",
        "settings-manage-networks": "Gestion des Réseaux",
        "settings-manage-networks-subtitle": "Affichez et cachez certains réseaux, et ajoutez des réseaux personnalisés",
        "settings-add-wallet-standard-wallet": "Portefeuille Standard",
        "settings-add-wallet-multi-sig-wallet": "Portefeuille Multi Signatures",
        "settings-add-wallet-hardware-wallet": "Portefeuille physique",
        "settings-add-wallet-new-wallet": "Nouveau portefeuille",
        "settings-add-wallet-mnemonic": "Mnémonique / clé papier",

        /***********************
        * Select-Currency Page *
        ************************/
        "select-currency-title": "Sélectionner la devise",
        "available-currencies": "Devises affichables",
        "united-states-dollar": "Dollar Américain",
        "chinese-yuan": "Yuan Chinois",
        "czk-koruna": "Couronne Tchèque",
        "euro": "Euro",
        "british-pound": "Livre Britannique",
        "japanese-yen": "Yen Japonais",
        "bitcoin": "Bitcoin",

        /**********************
        * Wallet Manager Page *
        ***********************/
        "wallet-manager-intro": "Les portefeuilles ont leurs propres paramètres. Vous pouvez configurer ces paramètres ci-dessous.",
        "wallet-manager-add-wallet": "Ajouter un portefeuille",

        /********************************************** Coin Screens ***********************************************/

        /*****************
        * Coin Home Page *
        ******************/
        "coin-new-transactions-today": "{{ todaysTransactions }} NOUVELLE(S) TRANSACTION(S) AUJOURD'HUI",
        "coin-balance": "Solde",
        "coin-action-recharge": "TRANSFERER",
        "coin-action-withdraw": "TRANSFERER",
        "coin-action-send": "ENVOYER",
        "coin-action-receive": "RECEVOIR",
        "coin-transactions": "Transactions",
        "coin-internal-transactions": "Trans. internes",
        "coin-no-transactions": "Aucune transaction",
        "coin-op-received-token": "Reçu",
        "coin-op-sent-token": "Envoyé",
        "coin-op-transfered-token": "Transféré",
        "coin-op-vote": "Vote",
        "coin-op-dpos-vote": "DPoS Vote",
        "coin-op-crc-vote": "CRC Vote",
        "coin-op-cr-proposal-against": "CR Proposal against",
        "coin-op-crc-impeachment": "CRC Impeachment",
        "coin-op-identity": "Publication d'identité",
        "coin-op-contract-create": "Création de contrat",
        "coin-op-contract-token-transfer": "Transfert de jeton ERC20",
        "coin-op-contract-call": "Execution de contrat",
        "coin-op-contract-destroy": "Transaction invalide",
        "coin-op-producer-register": "BPoS Node Registration",
        "coin-op-producer-cancel": "BPoS Node Cancellation",
        "coin-op-producer-update": "BPoS Node Update",
        "coin-op-producer-return": "BPoS Node Deposit Retrieve",
        "coin-op-cr-register": "CRC Registration",
        "coin-op-cr-cancel": "CRC Cancellation",
        "coin-op-cr-update": "CRC Update",
        "coin-op-cr-return": "CRC Deposit Retrieve",
        "coin-op-cr-claim-node": "Demander le noeud BPoS",
        "coin-op-proposal": "New Proposal",
        "coin-op-proposal-review": "Review Proposal",
        "coin-op-proposal-tracking": "Proposal Tracking",
        "coin-op-proposal-withdraw": "Proposal Fund Withdrawal",
        "coin-op-crc-claim": "CR Council Member Transaction",
        "coin-op-stake": "Stake",
        "coin-op-dpos2-voting": "BPoS Voting",
        "coin-op-dpos2-voting-update": "BPoS Voting Update",
        "coin-op-unstake": "Unstake",
        "coin-op-unstake-withdraw": "Unstake withdraw",
        "coin-op-dpos2-claim-reward": "BPoS Claim reward",
        "coin-op-dpos2-reward-withdraw": "BPoS reward withdraw",
        "coin-op-dpos2-node-claim-reward": "BPoS Node Claim reward",
        "coin-op-dpos2-node-reward-withdraw": "BPoS Node reward withdraw",
        "coin-op-voting-cancel": "Vote Cancellation",
        "coin-op-coin-base": "Coinbase Transaction",
        "coin-op-freeze": "Freeze",
        "coin-op-unfreeze": "Unfreeze",
        "coin-op-withdraw": "Withdraw",
        "coin-dir-from-mainchain": "Depuis ELA mainchain",
        "coin-dir-from-idchain": "Depuis la chaîne Identité",
        "coin-dir-from-ethsc": "Depuis la chaîne ESC",
        "coin-dir-to-mainchain": "c",
        "coin-dir-to-idchain": "Vers la chaîne ESC",
        "coin-dir-to-ethsc": "Vers la chaîne Identité",
        "coin-transaction-status-confirmed": "Confirmé",
        "coin-transaction-status-pending": "En attente",
        "coin-transaction-status-unconfirmed": "Non confirmé",
        "coin-transaction-status-not-published": "Non publié",
        "text-coin-close-warning": "Le jeton sera supprimé de la liste",

        /*******************
        * Coin Select Page *
        ********************/
        "coin-select-title": "Sélection du Jeton",

        /*********************
        * Coin Transfer Page *
        **********************/
        "coin-transfer-send-title": "Envoi d'argent",
        "coin-transfer-recharge-title": "Transfert d'argent",
        "coin-transfer-withdraw-title": "Transfert d'argent",
        "payment-title": 'Payment',
        "transfer-from": "Transfert depuis",
        "transfer-to": "Transfert vers",
        "transfer-amount": "Montant du transfert",
        "transfer-receiver-address": "Adresse de destination",
        "transfer-receiver-address-placeholder": "Veuillez entrer l'adresse de destination",
        "transfer-custum-address": "Use a custom destination address",
        "transfer-send-ela": "Envoi d'ELA",
        "balance": "Solde",
        "balance-remaining": "Solde restant:",
        "insufficient-balance": "Solde insuffisant",
        "transfer-all": "Tous",
        "max": "MAX",
        "touch-to-select-a-personal-wallet": "Toucher pour choisir un portefeuille personnel",
        "withdraw-note": "Le retrait minimal est de 0.0002 ELA et doit être un multiple de 0.00000001",
        'crosschain-note': "Les transferts inter-chaînes prennent généralement entre 15 et 25 minutes. Vous ne verrez pas vos fonds pendant ce temps, veuillez patienter.",
        "balance-locked": "( {{ locked }} locked )",
        "ela-coinbase-warning": "N'envoyez pas d'ELA de la chaîne Elastos Smart Chain ELA vers une adresse Coinbase, car les ELA sur Coinbase sont des jetons ERC20 ethereum.",
        "nft-transaction-creation-error": "Il semble que le transfert ne puisse pas être réalisé pour ce NFT. Certains NFTs sont bloqués et nécessitent des conditions spéciales pour être transférés. Veuillez vous renseigner auprès de la marketplace ou du créateur du NFT.",

        /********************
        * Coin Receive Page *
        *********************/
        "coin-receive-title": "Réception de {{coinName}}",
        "coin-receive-ela-address": "Votre adresse de réception {{coinName}}",
        "coin-receive-tap-to-copy": "Touchez l'adresse pour la copier",
        "coin-address-copied": "Adresse de votre portefeuille {{coinName}} copiée!",
        "coin-receive-address-list": "Voir la liste des adresses",

        /********************
        * Coin Address Page *
        *********************/
        "coin-address-msg": "Adresses disponibles",
        'coin-address-load-more': 'Chargement...',
        "coin-address-load-finish": 'Toutes les adresses sont affichées',

        /*********************
        * Contacts Component *
        **********************/
        "select-address": "Sélectionner une adresse",
        "cryptonames": "Noms de portefeuille",
        "delete-contact-confirm-title": "Supprimer le nom du portefeuille",

        /*******************************
        * Confirm Transaction Component *
        ********************************/
        "confirm-transaction-title": "Confirmer la Transaction",
        "transfer-transaction-type": "Transfert d'argent",
        "send-transaction-type": "Envoi d'argent",

        /***********************************
        * Transaction Successful Component *
        ************************************/
        'tx-success': "Transaction réussie",

        /***********************************
        * Options Component *
        ************************************/
        'paste': "Coller",
        'contacts': "Contacts",
        'scan': "Scanner",

        /***********************************
        * Network Switch Component *
        ************************************/
        'network-switch-component-title': 'Changement de Réseau',
        'network-switch-component-intro': 'Pour continuer, vous devez passer sur un réseau différent.',
        'network-switch-component-confirm': 'Changer le réseau',

        /************************
        * Transaction Info Page *
        *************************/
        "tx-info-title": "Détails sur la transaction",
        "tx-info-confirmations": "Confirmations",
        "tx-info-transaction-time": "Date de la transaction",
        "tx-info-memo": "Mémo",
        "tx-info-receiver-address": "Adresse de destination",
        "tx-info-sender-address": "Adresse de l'émetteur",
        "tx-info-transaction-fees": "Frais de transaction",
        "tx-info-cost": "Coût total",
        "tx-info-transaction-id": "Identifiant de transaction",
        "tx-info-block-id": "Identifiant de bloc",
        "tx-info-type-received": "Reçu",
        "tx-info-type-sent": "Envoyé",
        "tx-info-type-transferred": "Transféré",
        "tx-info-token-address": "Adresse du jeton ERC20",
        "tx-info-erc20-amount": "Montant du jeton ERC20",
        "tx-info-resource-consumed": "Resources Consumed",
        "tx-info-resource-bandwidth": "Bandwidth",
        "tx-info-resource-energy": "Energy",

        /***********************************
        * ETH Transaction Component *
        ************************************/
        "eth-sending-transaction": "Envoi de la transaction",
        "eth-transaction-wait": "Veuillez patienter...",
        "eth-transaction-fail": "Echec de la transaction",
        "eth-transaction-pending": "La transaction n'est pas confirmée",
        "eth-transaction-speedup-prompt": "Vous pouvez accélérer la transaction en augmentant le prix du gas",
        "eth-transaction-speedup": "Accélérer",
        "eth-gasprice": "Prix du Gas (GWEI)",
        "eth-gaslimit": "Limite Gas",

        /**************************
        * Token chooser component *
        ***************************/

        'select-a-token': 'Choix du jeton',
        'select-token-intro': 'Quel jeton souhaitez-vous utiliser?',

        /**************************
        * Wallet chooser component *
        ***************************/

        'unsupported-on-network': 'Unsupported on the {{network}} network.',

        /*********************
         * Ledger Sign Component *
         **********************/
        "ledger-sign": "Sign with Ledger",
        "ledger-connecting": "Searching Ledger Wallet",
        "ledger-prompt": "Please open Ledger Nano X, keep it unlocked, and open the {{appname}} application",
        "ledger-connected-device": "Connected device",
        "ledger-confirm-on-ledger-prompt": "After clicking continue, please check the transaction on Ledger and confirm!",

        /*******************
        * Ledger scan page *
        ********************/
        "ledger-scan": "Recherche Ledger",
        "ledger-scan-available-devices": "Appareils disponibles",
        "ledger-scan-scan-again": "Re-scanner",
        "ledger-scan-paired-devices": "Appareil couplé",
        "ledger-scan-ledger-scanning": "Recherche en cours",
        "ledger-scan-bluetooth-not-enable": "Le bluetooth est éteint, veuillez l'allumer",
        "ledger-scan-open-bluetooth-setting": "Ouvrir les paramètres bluetooth",

        /**********************
        * Ledger connect page *
        ***********************/
        "ledger-connect": "Compte Ledger",
        "ledger-device": "Appareil",
        "ledger-connect-error": "Impossible de se connecter à l'appareil",
        "ledger-connecting-to-device": "Connexion en cours",
        "ledger-addresses": "Adresses",
        "ledger-address-type": "Type d'adresse",
        "ledger-pick-network": "Choisir un réseau",
        "ledger-connect-ledger-sucess": "Portefeuille physique Ledger connecté",
        "ledger-getting-addresses": "Getting address",
        "ledger-get-addresses": "Get addresses",
        "ledger-get-more-addresses": "View more addresses",
        "ledger-choose-address-type": "Choose Address Type",
        "ledger-reconnect": "Touch to connect",


        /**********************
        * Ledger error *
        ***********************/
        "ledger-error-app-not-start": "Please open the {{appname}} application on the Ledger Nano X",
        "ledger-error-operation-cancelled": "Operation cancelled",
        "ledger-error-unknown": "Unknown error",
        "ledger-error-contractdata": "Please enable Blind signing or Contract data in the Ethereum app Settings",

        /********************************************** Wallet Settings Screens ***********************************************/

        /***********************
        * Wallet Settings Page *
        ************************/
        "wallet-settings-title": "Paramètres Portefeuille",
        "wallet-settings-backup-wallet": "Sauvegarde",
        "wallet-settings-backup-wallet-subtitle": "Visualisez votre mnémonique pour le sauvegarder en lieu sûr.",
        "wallet-settings-backup-wallet-export": "Exporter clé papier et clé privée EVM",
        "wallet-settings-backup-wallet-keystore": "Exporter le keystore",
        "wallet-settings-change-name": "Renommer",
        "wallet-settings-change-name-subtitle": "Organisez vos portefeuilles en leur donnant un nom personnalisé.",
        "wallet-settings-change-theme": "Modifier le thème",
        "wallet-settings-change-theme-subtitle": "Organisez vos portefeuilles avec des couleurs personnalisées.",
        "wallet-settings-manage-coin-list": "Gérer la Liste des Jetons",
        "wallet-settings-manage-coin-list-subtitle": "Sélectionnez les jetons à gérer dans votre portefeuille.",
        "wallet-settings-delete-wallet": "Supprimer le Portefeuille",
        "wallet-settings-delete-wallet-subtitle": "Votre argent ne sera pas supprimé. Vous pourrez réimporter votre portefeuille plus tard.",
        "wallet-settings-migrate-did1": "Transfert des fonds DID 1.0",
        "wallet-settings-migrate-did1-subtitle": "Transfert des ELA restants de la châine DID 1.0 obsolète vers la chaîne principale",
        "wallet-settings-migrate-did1-intro": "Ceci est une opération unique. Vos fonds restants sur la chaîne DID 1.0 seront transférés vers la chaîne principale. Après cela, la chaîne DID 1.0 disparaîtra de votre portefeuille.",
        "delete-wallet-confirm-title": "Supprimer le Portefeuille",
        "delete-wallet-confirm-subtitle": "Votre portefeuille sera supprimé de cet appareil. Vous pourrez le réimporter plus tard mais veillez à enregistrer votre mnémonique avant la suppression.",
        "wallet-settings-consolidate-utxos": "Consolider",
        "wallet-settings-consolidate-utxos-subtitle": "Trop d'utxo augmente le temps de création de la transaction",
        "wallet-settings-consolidate-no-need": "Pas besoin de consolidation",
        "wallet-settings-extended-public-keys-title": "Clés publiques étendues",
        "wallet-settings-extended-public-keys-subtitle": "Clés spéciales requises pour créer des portefeuilles multi-signataires",
        "wallet-settings-multisig-extended-public-keys-title": "Multi-signature wallet extension public key information",
        "wallet-settings-multisig-extended-public-keys-subtitle": "Display extension public keys for all signers",

        /************************
        * Wallet Edit Name Page *
        *************************/
        "wallet-edit-name-title": "Modification du nom",
        "wallet-edit-name-new-name": "Nouveau nom pour ce portefeuille",

        /***************************
        * Wallet Change Theme Page *
        ****************************/
        "change-wallet-theme-title": "Changement du thème",

        /************************
        * Wallet Coin List Page *
        *************************/
        "coin-list-title": "Gestion des Jetons",
        "coin-list-enable-disable-coins": "Activer/Désactiver des Jetons",
        "coin-list-enable-disable-coins-intro": "Sélectionnez les jetons que vous souhaitez afficher dans le portefeuille actuel.",
        "erc-20-token": "Jeton ERC20",
        "new-coins": "Nouveaux jetons",
        "all-coins": "Tous les jetons",
        "search-coin": "Rechercher des jetons",

        /***********************
        * Export Mnemonic Page *
        ************************/
        'text-export-mnemonic': 'Exporter le mnémonique',

        /***********************
        * ERC20 Details Page *
        ************************/
        'coin-erc20-details-address': 'Adresse du contract',
        'coin-erc20-details-share': 'Partager',
        'coin-erc20-details-delete': 'Supprimer',
        'delete-coin-confirm-title': 'Supprimer le jeton',
        'delete-coin-confirm-subtitle': 'Ce jeton sera supprimé de votre portefeuille mais vos devises existeront toujours. Pour voir votre balance, vous devrez ajouter ce jeton à nouveau.',

        /*****************
        * Add ERC20 Page *
        ******************/
        "coin-adderc20-title": "Ajout de jeton ERC20",
        "coin-adderc20-intro": 'Saisir l\'adresse du jeton,',
        "coin-adderc20-intro2": 'ou scanner son QR code.',
        "coin-adderc20-enteraddress": 'Saisir l\'adresse du jeton',
        "coin-adderc20-add": 'Ajouter le jeton',
        "coin-adderc20-search": 'Rechercher le jeton',
        "coin-adderc20-name": 'Nom du jeton',
        "coin-adderc20-symbol": 'Symbole',
        "coin-adderc20-not-a-erc20-contract": "Le contenu n'est pas une adresse de jeton ERC20 valide.",
        "coin-adderc20-invalid-contract-or-network-error": "Le contenu n'est pas une adresse de jeton ERC20 valide, ou erreur réseau.",
        'coin-adderc20-alreadyadded': 'Ce jeton est déjà dans la liste',
        'coin-adderc20-not-found': 'Impossible de trouver l\'adresse du jeton.',

        /***********************
        * Manage networks Page *
        ************************/
        'manage-networks-title': 'Gestion des réseaux',
        'manage-networks-intro': 'Sélectionnez les réseaux que vous souhaitez voir dans la liste des réseaux courants. Cachez ceux que vous n\'utilisez pas. Vous pouvez aussi ajouter des réseaux personnalisés compatibles Ethereum via l\'icône plus ci-dessus.',

        /***********************
        * Custom networks Page *
        ************************/
        'custom-networks-title': 'Réseaux personnalisés',
        'add-custom-network-title': 'Ajouter un réseau',
        'edit-custom-network-title': 'Modifier un réseau',
        'custom-networks-intro': 'Gérez vos propres réseaux compatibles EVM (Ethereum) ici.',
        'add-custom-network': '+ Nouveau Réseau',
        'network-name': 'Nom',
        'network-rpc-url': 'URL RPC',
        'network-account-rpc-url': 'URL RPC de compte (optionnel)',
        'network-chain-id': 'ID de chaîne',
        'network-token-symbol': 'Symbol principal (optionnel)',
        'checking-rpc-url': 'Vérification de l\'url en cours',
        'checking-account-rpc-url': 'Vérification de l\'url de compte en cours',
        'wrong-rpc-url': 'L\'url fournie n\'a pas pu être contactée et est peut-être erronée. Veuillez la vérifier.',
        'wrong-account-rpc-url': 'L\'url de compte fournie n\'a pas pu être contactée et est peut-être erronée. Veuillez la vérifier.',
        'cant-delete-active-network': 'Le réseau actif ne peut pas être supprimé. Veuillez d\'abord choisir un autre réseau.',
        'delete-network-prompt-title': 'Supprimer le réseau ?',
        'delete-network-prompt-text': 'Voulez-vous vraiment supprimer ce réseau ?',

        /***********************
        * Asset Overview Page *
        ************************/
        'wallet-asset-title': 'Résumé financier',
        "wallet-asset-networks-count": "{{ networksCount }} réseaux",
        'staked-assets-info-by': 'Informations hors portefeuille fournies par',

        /************
        * NFT pages *
        *************/
        'nft-overview': 'Mes NFTs',
        'nft-assets': 'Actifs',
        'nft-token-id': 'Identifiant',
        'nft-collectibles-cant-be-listed': 'Les actifs pour ce type de NFT ne peuvent pas être listés.',
        'nft-unnamed-asset': 'NFT sans nom',
        'nft-asset-with-type': 'NFT de type {{ type }}',
        'nft-properties': 'Propriétés',
        'nft-no-properties-yet': 'L\'affichage des propriétés sera disponible prochainement.',
        'nft-assets-owned': 'NFTs possédés',
        'nft-attributes': 'Attributs',

        /********************************************** Intent Screens ***********************************************/

        /************************
        * Select Subwallet Page *
        *************************/
        'select-subwallet': 'Sélectionner le portefeuille',
        'select-wallet': 'Sélectionner le portefeuille',

        /**************
        * Access Page *
        ***************/
        "access-title": "Accès portefeuille",
        "access-subtitle-wallet-access-from": "Demande d'informations:",
        "access-subtitle-access-mnemonic-from": "Accès au Mnémonique (!):",
        "access-request-for-info": "Ceci est une demande d'accès aux informations de votre portefeuille.",
        "access-reason": "Raison",
        "access-data-access": "Accès aux données",
        'access-mnemonic': 'Accès au mnémonique',
        'elaaddress': 'Adresse ELA',
        'elaamount': "Solde d'ELA",
        'ethaddress': 'Adresses ESC',
        'requester': 'Demandé par',
        'text-allow': 'Autoriser',
        'text-share-mnemonic-warning': 'Le mnémonique donne un accès total à tous vos actifs numériques. Veuillez confirmez que vous le partagez avec un tiers de confiance!',

        /***********************
        * DID Transaction Page *
        ************************/
        "didtransaction-title": "Publication d'identité",
        "didtransaction-publish-identity": "Publication d'identité",
        "didtransaction-transaction-fee": "Des frais de transaction mineurs s'appliquent",
        "didtransaction-intro": "Vous vous apprêtez à publier votre identité sur la châine publique.",

        /*******************
        * Voting Common *
        ********************/
        "vote-you-are-voting": "Vous votez!",
        "vote-transaction-fees": "Des frais de transaction de 0.0001 ELA seront prélevés",
        "vote-revote": "Pensez à voter à nouveau après avoir utilisé des ELA de votre portefeuille principal.",

        /*******************
        * DPoS Voting Page *
        ********************/
        "dposvote-title": "Vote pour les Supernodes",
        "dposvote-voting-for": "Vous allez voter pour:",
        "dposvote-with": "Avec:",

        /***********************
        * CRCrouncil Voting Transaction Page *
        ************************/
        "crcouncilvote-title": "Vote pour le Conseil CR",
        "crcouncilvote-voting-with": "Vous votez avec:",

        /***********************
        * ESC Transaction Page *
        ************************/
        "esctransaction-title": "Transaction",
        "esctransaction-smart-contract": "Contrat intelligent",
        "esctransaction-intro": "Vous allez signer et éxécuter un contrat intelligent.",
        "esctransaction-approve-token": "Autoriser un Jeton",
        "esctransaction-approve-token-intro": "Cette application ou site web pourra retirer ou dépenser vos {{token}} pour vous.",
        "esctransaction-you-are-using": "Vous utilisez:",
        "esctransaction-value": "Montant:",
        "esctransaction-fees": "Frais maximal estimé:",

        /***********************
        * Sign Typed Data Page *
        ************************/
        "signtypeddata-title": "Signature de données",
        "signtypeddata-subtitle": "Signature",
        "signtypeddata-intro": "L'application a besoin de signer certaines informations avec la signature de votre portefeuille. Veuillez confirmer pour continuer.",
        "signtypeddata-danger": "Signer ce message peut être dangereux. Cette signature peut éventuellement permettre à l'application de prendre le contrôle complet de votre portefeuille et de tous ses fonds. Ne signez ceci que si vous savez ce que vous faites ou si vous faites totalement confiance à l'application.",

        /***********************
        * No Wallet *
        ************************/
        "intent-no-wallet-title": "Aucun Portefeuille",
        "intent-no-wallet-msg": "Vous n'avez pas de portefeuille, voulez-vous le créer maintenant?",

        /********************************************** Create Wallet Screens ***********************************************/

        /****************
        * Launcher Page *
        *****************/
        'wallet-prompt1': 'Votre Portefeuille',
        'wallet-prompt2': 'Numérique Sécurisé',
        'get-started': 'Commencer',
        'import-wallet-msg': 'Vous avez déjà un portefeuille? Importez-le.',
        'launcher-create-wallet': 'Créer le portefeuille',
        'new-standard-wallet': 'New standard wallet',
        'import-standard-wallet': 'Import standard wallet',
        'multi-sig-wallet': 'Multi-sig wallet',
        'ledger-hardware-wallet': 'Ledger Nano X hardware wallet',

        /*********************
        * Wallet Create Page *
        **********************/
        'enter-wallet-name': 'Veuillez saisir un nom pour le portefeuille',
        'single-address': 'Portefeuille à adresse unique',
        'multiple-address': 'Portefeuille à adresses multiples',
        'use-passphrase': 'Utiliser une phrase secrète',
        'not-use-passphrase': 'Ne pas utiliser de phrase secrète',
        'launcher-backup-import': 'Importer le portefeuille',
        "text-wallet-name-validator-enter-name": "Veuillez saisir un nom pour votre portefeuille",
        "text-wallet-name-validator-not-valid-name": "Le nom saisi n'est pas valide",
        "text-wallet-name-validator-already-exists": "Ce nom est déjà utilisé par un autre portefeuille",
        "text-wallet-passphrase-validator-repeat": "Les deux phrases secrètes saisies sont différentes",
        "text-wallet-passphrase-validator-min-length": "La phrase secrète doit avoir au moins 8 caractères",
        "import-wallet-by-mnemonic": "Import par mots secrets",
        "import-wallet-by-privatekey": "Import par clé privée EVM",

        /*****************
        * Mnemonic Pages *
        *****************/
        'mnemonic-prompt1': 'Voici vos 12 mots secrets (mnémonique). Si vous les perdez, vous perdez votre portefeuille, alors notez-les quelque part ',
        'mnemonic-prompt2': 'dans le bon ordre',
        'mnemonic-prompt3': ', et en sécurité!',
        'back-to-setting': 'Retour aux paramètres',
        'view-mnemonic': "Voir le mnémonique",
        'mnemonic-warning1': 'Gardez-le secret,',
        'mnemonic-warning2': 'Gardez-le en sécurité!',
        'mnemonic-warning3': 'Ne partagez jamais votre mnémonique avec personne et gardez-le toujours en sécurité! Assurez-vous que personne ne regarde lorsque vous cliquez ci-dessous.',
        'type-menmonic-verify': 'Veuillez saisir vos 12 mots de sécurité (Votre mnémonique) afin de les vérifier.',
        'type-menmonic-import': 'Saisissez les mots de votre mnémonique pour importer votre portefeuille.',
        'import-text-word-sucess': 'Portefeuille importé depuis votre mnémonique',
        'next-four-words': '4 mots suivants',
        'create-wallet': 'Création de Portefeuille',
        'import-wallet': 'Import de Portefeuille',
        "mnemonic-import-missing-words": "Veuillez saisir tous les mots avant de continuer",
        "mnemonic-check-title": "Vérification du mnémonique",
        "memory-written-down": "Je l'ai noté",
        "mnemonic-verify-sucess": "Mnémonique vérifié et confirmé",
        "mnemonic-verify-fail": "Le mnémonique est incorrect, veuillez le saisir à nouveau.",
        "mnemonic-input-passphrase": "Mot de passe associé au mnémonique",
        "mnemonic-reinput-passphrase": "Saisir le mot de passe à nouveau",
        "help:create-password": "Il s'agit d'un mot de passe optionnel qui augmente la sécurité du mnémonique. Considérez-le comme un 13e mot du mnémonique. Notez bien que ce mot de passe ne pas pas être retrouvé si vous l\'oubliez. Saisir un mauvais mot de passe de mnémonique dans l\'avenir lorsque vous importerez votre portefeuille ne génèrera pas d\'erreur mais créera une adresse de portefeuille différente, et vous ne verrez pas vos fonds.",
        "help:import-password": "Le mot de passe du mnémonique est un mot de votre choix qui est fortement associé à votre mnémonique. Ne tenez pas compte de cette option si vous n\'avez pas utilisé de mot de passe de mnémonique lors de la création de votre portefeuille.",
        "privatekey-tap-to-copy": "Toucher la clé privée pour copier",
        "export-private-key-intro": "Vous pouvez aussi choisir d'utiliser la clé privée suivante dans certaines applications. Touchez pour copier.",
        "export-tron-private-key-intro": "Clé privée du réseau Tron",
        "import-paste-from-keypad": "Note: vous pouvez coller une clé papier en entier depuis le clavier",

        /***********************
        * Export Keystore Page *
        ************************/
        "keystore-title": "Exporter le keystore",
        "keystore-export-intro": "Toucher pour copier",
        "keystore-input-password": "Définir le mot de passe du keystore",
        "keystore-reinput-password": "Répétrer le mote de passe du keystore",
        "keystore-export": "Exporter",
        "keystore-password-validator-repeat": "Les deux mots de passe sont différents",
        "keystore-password-validator-min-length": "Le mot de passe doit être d\'au moins 8 caractères",

        /********************************
        * Import Wallet by private key Page *
        *********************************/
        'import-wallet-by-privatekey-info': 'Clé privée: Seules les clés privées des portefeuilles EVM (type Ethereum) sont supportées.',
        'import-wallet-by-keystore-info': 'Keystore: seul les keystore elastos sont supportés',
        'paste-privatekey': 'Coller ou saisir la clé privée',
        'wrong-privatekey-msg': 'Veuillez saisir une clé privée valide',
        'import-private-key-sucess': 'Portefeuille importé depuis une clé privée',
        'import-keystore-sucess': 'Portefeuille importé depuis un keystore',
        'keystore-backup-password': 'Veuillez saisir le mot de passe du keystore',

        /***************************
        * Earn, Swap, Bridge pages *
        ****************************/
        'view-transactions': 'Transactions & Transferts',
        'earn': 'Epargner',
        'swap': 'Echanger',
        'bridge': 'Vers d\'autres réseaux',
        'wallet-coin-earn-title': 'Services d\'épargne',
        'wallet-coin-swap-title': 'Services d\'échanges',
        'wallet-coin-bridge-title': 'Services inter-réseaux',
        'providers-disclaimer': 'Les services listés sur cette page sont des <b>services tiers non liés à Essentials</b>. Faites vos propres vérifications sur ces plateformes avant de les utiliser.',
        'finance-platforms': 'Plateformes Financières',
        'finance-platforms-intro': 'Les plateformes suivantes peuvent gérer ce jeton pour éventuellement faire des bénéfices.',
        'get-more-tokens': 'Plus de Jetons',
        'get-more-tokens-intro': 'Les fournisseurs de services tiers suivants vous permettent d\'obtenir <b>plus de jetons {{coinName}}</b> en échangeant d\'autres jetons:',
        'bridge-tokens': 'Convertir vos Jetons',
        'bridge-tokens-intro': 'Les fournisseurs de services tiers suivants sont disponibles pour vous permettre de <b>convertir vos {{coinName}}</b> depuis/vers le réseau {{networkName}}, vers/depuis d\'autres réseaux:',
        'to-networks': 'Vers autres réseaux:',

        /********************************
        * Multisig standard wallet page *
        *********************************/

        'multi-sig-wallet-name': 'Nom du portefeuille',
        'multi-sig-my-signing-wallet': 'Mon portefeuille signataire',
        'multi-sig-pick-a-wallet': 'Choisir un portefeuille',
        'multi-sig-other-co-signers': 'Autres co-signataires',
        'multi-sig-input-xpub-key-prompt': 'Saisir une clé xpub vqlide',
        'multi-sig-add-cosigner': 'Ajouter un co-signataire',
        'multi-sig-total-signers': 'Total des signataires',
        'multi-sig-required-signers': 'Signataires requis',
        'multi-sig-new-wallet-title': 'Nouveau portef. multi-sign.',
        'multi-sig-error-no-signing-wallet': "Veuillez choisir un portefeuille avec lequel vous signerez les transactions",
        'multi-sig-error-invalid-xpub': 'Veuillez saisir une clé xpub vqlide',
        'multi-sig-error-xpub-in-user': 'Cette clé est déjà dans la liste, veuillez en choisir une autre',

        /********************************
        * Multisig tx details component *
        *********************************/
        'multi-signature-status': 'Statut Multi signature',
        'multi-signature-my-signature': 'Ma signature',
        'multi-signature-sign': 'Signer',
        'multi-signature-signed': 'Signé',
        'multi-signature-not-signed': 'Non signé',
        'multi-signature-publish': 'Publier',
        'multi-signature-transaction-link': 'Lien pour co-signataires',
        'multi-signature-transaction-link-copy-info': 'Donnez ce lien aux autres co-signataires pour qu\'ils puisse continuer le procesus.',
        'multi-signature-transaction-link-copied': 'Le lien a été copié dans le press-papier',

        /***************************
        * Multisig tx intent page  *
        ****************************/
        'multi-sig-tx-title': 'Transaction multi-sig',
        'multi-sig-tx-fetching': 'Récupération des infos sur la transaction.',
        'multi-sig-tx-no-tx-found': 'Aucune transaction n\'a été trouvée.',
        'multi-sig-tx-unknown-network': 'Cette transaction est pour un réseau non supporté par votre version d\'Essentials.',
        'multi-sig-tx-pick-wallet': 'Choisissez le portefeuille multi-signatures à utiliser.',
        'multi-sig-tx-select-wallet': 'Sélectionner le portefeuille',
        'multi-sig-tx-selected-wallet': 'Portefeuille sélectionné',
        'multi-sig-tx-switched-to-network': 'Réseau changé vers {{ network }}',

        /***************************
        * Multisig extended public key page  *
        ****************************/
        'multi-sig-extended-public-key-title': 'Extended public key',
        'multi-sig-extended-public-key-copied': 'Extended public keys copied to clipboard',
        'multi-sig-extended-public-key-info': 'Here is your extended public key. You can use this key as a co-signer key for multi-signature wallets.',
        'multi-sig-extended-public-key-copy': 'Tap the key to copy',
        'multi-sig-extended-public-key-note': 'Technical note',
        'multi-sig-extended-public-key-note-info': 'This extended public key is derived using BIP45 in order to be used in a multi-signature wallet, while your elastos mainchain wallet is BIP44 for historical reasons.',

        /********************************
        * Multisig info page *
        *********************************/
        'multi-sig-my-signing-wallet-extended-public-key': 'My signing wallet extended public key',
        'multi-sig-co-signers-extended-public-key': 'Other cosigners extended public key',

        /************************
        * Offline transactions  *
        *************************/

        'offline-tx-pending-multisig': 'Multi-signature en attente',
        'offline-tx-unknown-tx': "Transaction inconnue",

        /*****************************
        * Extended transaction info  *
        ******************************/
        'ext-tx-info-type-send-nft': 'Envoi de NFT',
        'ext-tx-info-type-send-nft-name': 'Envoi de {{ name }}',
        'ext-tx-info-type-send-erc20': 'Envoi de {{ symbol }}',
        'ext-tx-info-type-send-tokens': 'Envoi de jetons',
        'ext-tx-info-type-swap-erc20': '{{ fromSymbol }} → {{ toSymbol }}',
        'ext-tx-info-type-swap-tokens': 'Echange de jetons',
        'ext-tx-info-type-approve-token': 'Approbation de jetons',
        'ext-tx-info-type-approve-erc20': 'Approbation de {{ symbol }}',
        'ext-tx-info-type-bridge-tokens': 'Transfert cross-chaine',
        'ext-tx-info-type-bridge-erc20': 'Transfert cross-chaine {{ symbol }}',
        'ext-tx-info-type-liquidity-deposit': 'Dépôt de liquidités',
        'ext-tx-info-type-add-liquidity-with-symbols': 'Ajout de {{ symbolA }} + {{ symbolB }} LP',
        'ext-tx-info-type-add-liquidity-with-one-symbols': 'Ajout de {{ symbolA }} LP',
        'ext-tx-info-type-remove-liquidity': 'Retrait de liquidités',
        'ext-tx-info-type-remove-liquidity-with-symbols': 'Retrait de {{ symbolA }} + {{ symbolB }} LP',
        'ext-tx-info-type-withdraw': 'Retrait',
        'ext-tx-info-type-get-rewards': 'Récompenses',
        'ext-tx-info-type-get-booster-rewards': 'Récompenses de booster',
        'ext-tx-info-type-deposit': 'Depôt',
        'ext-tx-info-type-stake': 'Stake',
        'ext-tx-info-type-mint': 'Création de jeton',
        'ext-tx-info-type-redeem': 'Récupération',
        'ext-tx-info-type-lock': 'Blocage',
        'ext-tx-info-type-claim-tokens': 'Retrait de jetons',
        'ext-tx-info-type-withdraw-to-mainchain': 'Vers ELA mainchain',
        'ext-tx-info-type-harvest': 'Récolter',
        'ext-tx-info-type-buy-nft': 'Buy NFT',
        'ext-tx-info-type-sell-nft': 'Sell NFT',
        'ext-tx-info-type-nft-tx': 'NFT transaction',
        'ext-tx-info-type-inscription': 'Inscription transaction',
        'ext-tx-info-type-inscription-deploy': 'Deploy Inscription',
        'ext-tx-info-type-inscription-mint': 'Mint Inscription',
        'ext-tx-info-type-inscription-transfer': 'Transfer Inscription',
        'ext-tx-info-type-inscription-list': 'List Inscription',

        /********************************
        * Tron Resource page *
        *********************************/
        'resource': 'Resource',
        'resource-title': 'Resource Management',
        "resource-type": "Resource Type",
        'resource-bandwith': 'Bandwidth',
        'resource-energy': 'Energy',
        'resource-freeze': 'Freeze',
        'resource-unfreeze': 'Unfreeze',
        "resource-choose-type": "Choose Resource Type",
        "resource-freeze-balance": "Freeze amount",
        "resource-unfreeze-balance": "Unfreeze amount",
        "resource-to-unfreeze": "Balance to be unfrozen: ",
        "resource-unfreeze-time": "Time to be unfrozen: ",
        "resource-no-trx-to-unfreeze": "No frozen TRX, no need to unfreeze",
        "resource-to-unfreeze-stakev1": "Please unfreeze Stack V1 resources first：",
        "resource-freeze-note": "After completing the TRX staking, you can unstake at any time. After unstaking, you need to wait for 14 days before you can withdraw the unstaked TRX into your account.",
        "resource-unfreeze-note": "After unstaking, you need to wait for 14 days before you can withdraw the unstaked TRX into your account.",
        "resource-withdraw": "Withdraw",
        "resource-to-withdraw": "Balance to be withdrawn: ",
        "resource-withdraw-time": "Time to be withdrawn: ",

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
        'text-consolidate-prompt': 'Consolider?',
        'text-consolidate-UTXO-counts': 'Nombre d\'UTXOs: {{ count }}',
        'text-consolidate-note': 'Trop d\'UTXO peuvent provoquer l\'échec de certaines transactions, il est recommandé de consolider. La consolidation n\'affecte pas les votes en cours',
        'reasons-failure': 'Cause de l\'échec',
        "notification-too-many-utxos": "The number of UTXOs in ELA mainchain of wallet {{ walletname }} has reached {{ count }}. It is recommended that you consolidate UTXOs!",

        // Error codes
        'Error-10000': 'Json parse error of action parameters',
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
        'Error-20005': 'Create master wallet error',
        'Error-20006': 'Create sub wallet error',
        'Error-20007': 'Parse json array error',
        'Error-20008': 'Mnémonique invalide',
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
        'Error-20036': 'Json format error',
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

        'did-oversize': 'DID Over Size',
        'transaction-same-account': 'Cannot transfer TRX to the same account',
    },
};