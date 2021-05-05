export const en = {

    'developertools': {

        'dev-toolbox': 'Developer Toolbox',
        'my-apps': 'My Applications',
        'no-apps': 'No Applications',
        'no-apps-available': 'No Apps Available',
        'new-app': 'New App',
        'provide-name': 'Please provide your app a name',
        'provide-mnemonic': 'Please provide an existing app DID mnemonic, otherwise create a new one to proceed',
        'create-new-app': 'Create New App',
        'create-app-message': 'Creating a new app means creating a new permanent DID for it. This DID must be saved carefully because this is the only way to upgrade your application in the future. To learn how to build an app, visit https://developer.elastos.org',
        'app-name': 'App Name',
        'create-did': 'Create a new DID',
        'import-did': 'Import an existing DID',
        'existing-app-did-mnemonic': 'Existing App DID Mnemonic',
        'mnemonic-passphrase': 'Mnemonic Passphrase',
        'if-any': '(If any)',
        'create-app': 'Create App',
        'app-created': 'App Created!',
        'save-mnemonic': 'Please save your mnemonic carefully:',
        'manage-app': 'Manage App',
        'generic-app-info': 'Generic App Info',
        'app-identity-status': 'App Identity Status',
        'app-did-published?': 'App DID Published?',
        'dev-did-published?': 'Developer DID Published?',
        'app-did-copied': 'Application DID copied to clipboard',
        'checking': 'Checking...',
        'yes-published': 'YES - All good',
        'no-published': 'NO - Please publish',
        'app-attached-to-dev': 'Is your app attached to your developer?',
        'dev-did': 'Developer\'s DID',
        'native-redirect-url': 'Native Redirect URL',
        'native-callback-url': 'Native Callback URL',
        'native-scheme': 'Native Custom Scheme',
        'publish-app-did': 'Publish App DID',
        'up-to-date': 'Everything is up to date, nothing to publish',
        'different-did': 'Different from currently signed in user - please publish to update',
        'uploading-icon': 'Uploading app icon to developer\'s hive vault, please wait...',

        // Placeholders
        'redirecturl-placeholder': 'Set your intents redirect url here if any',
        'nativecustomscheme-placeholder': 'Set your custom scheme here if any',
        'nativecallbackurl-placeholder': 'Set your intents callback url here if any',

        // Components
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
