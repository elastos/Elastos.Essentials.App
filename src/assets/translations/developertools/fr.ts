export const fr = {

    'developertools': {
        // Pages
        'dev-toolbox': 'Outils Développeurs',
        'my-apps': 'Mes Applications',
        'no-apps': 'Aucune Application',
        'no-apps-available': 'Aucune app disponible',
        'new-app': 'Nouvelle Appli',
        'provide-name': 'Veuillez nommer l\'application',
        'provide-mnemonic': 'Veuillez fournir un DID d\'application existant, ou en créer un nouveau',
        'create-new-app': 'Créer une Application',
        'create-app-message': 'Creating a new app means creating a new permanent DID for it. This DID must be saved carefully because this is the only way to upgrade your application in the future. To learn how to build an app, visit https://developer.elastos.org',
        'app-name': 'Nom de l\'application',
        'create-did': 'Créer une nouveau DID',
        'import-did': 'Importer un DID existant',
        'existing-app-did-mnemonic': 'Mnémonique du DID existant',
        'mnemonic-passphrase': 'Passphrase du Mnémonique',
        'if-any': '(Si relevant)',
        'create-app': 'Créer l\'appli',
        'app-created': 'Appli créée!',
        'save-mnemonic': 'Veuillez enregistrer votre mnémonique avec soin:',
        'manage-app': 'Gérer l\'appli',
        'generic-app-info': 'Infos Générique de l\'Appli',
        'app-identity-status': 'Statut Identité Appli',
        'app-did-published?': 'DID de l\'appli publié?',
        'dev-did-published?': 'DID du Développeur publié?',
        'app-did-copied': 'DID de l\'application copié dans le presse-papier',
        'checking': 'Vérification...',
        'yes-published': 'OUI - Tout va bien',
        'no-published': 'NON - Veuillez publier',
        'app-attached-to-dev': 'Application rattachée au développeur?',
        'dev-did': 'DID du Développeur',
        'native-redirect-url': 'URL de redirection (natif)',
        'native-callback-url': 'URL de callback (natif)',
        'native-scheme': 'Scheme personnalisé (natif)',
        'publish-app-did': 'Publier le DID de l\'appli',
        'up-to-date': 'Tout est à jour, rien à publier',
        'different-did': 'Différent de l\'utilisateur courant. Publier pour mettre à jour.',
        'uploading-icon': 'Envoie de l\'icône de l\'application vers le stockage Hive du développeur, veuillez patienter...',

        // Placeholders
        'redirecturl-placeholder': 'Saisir votre "redirect url" ici si vous en avez une',
        'nativecustomscheme-placeholder': 'Saisir votre "custom scheme" ici si vous en avez un',
        'nativecallbackurl-placeholder': 'Saisir votre "callback url" ici si vous en avez une',

        // Components - NO FRENCH TRANSLATION FOR NOW FOR THIS
        'appIdentityHelpMessage': 'Your application identifier on the Elastos DID chain is independant from any publication or platform such as Elastos Essentials or native Android/iOS. It is only a way to proove ownerships, but this is a mandatory step to start with.',
        'nativeRedirectUrlHelpMessage': 'Native applications need to save their intent scheme base url in their public DID document, in order to secure inter application communications. Ex: https://elastosapp.mysite.org. Redirect URLs send native intent on mobile devices. Used by native mobile apps.',
        'nativeCustomSchemeHelpMessage': 'Native applications (android) should provide a short custom scheme (ex: myapp) that are used for example by trinity native to send intent responses. For trinity native, this custom name must match the one configured in trinitynative.json.',
        'nativeCallbackUrlHelpMessage': 'Native applications need to save their intent scheme base url in their public DID document, in order to secure inter application communications. Ex: https://elastosapp.mysite.org. Callback URLs send HTTP POST requests to a remote HTTP server. Used by websites.',
        'help-message': 'An app DID store password is an ordinary password used to access the created app\'s profile. Make sure to keep this password stored safely',
        'help-message2': 'If you have already created an app, you may use its existing DID mnemonic to create another app profile',
        'help-message3': 'For advanced use only, this mnemonic is only necessary if you want to use your wallet\'s passphrase for extra security',
        'delete-app-msg': 'In order to recover this app for future access and updates, you will have to create a new app with the same mnemonics'
    }

};
