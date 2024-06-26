export const en = {

        'settings': {
                /********** Generic **********/
                'change-pw-success': 'Password reset was successful',
                'change-pw-fail': 'Password reset failed. Please try again later',

                /********** Menu Page **********/
                // Titles
                'capsule-setting': 'Capsule Settings',
                'about-setting': 'About',
                'developer-setting': 'Developer Options',
                'display-setting': 'Change Theme',
                'dev-mode': 'Developer Mode',
                'passwordmanager-setting': 'Password Manager',
                'wallet-setting': 'My Wallet',
                'wallet-connect-sessions-setting': 'Wallet Connect Sessions',
                'privacy-setting': 'Privacy',
                'startupscreen-setting': 'Startup Screen',
                'startupscreen-intro-setting': 'Choose which screen to show when Essentials starts',

                // Subtitles
                'advanced-setting': 'Advanced settings',
                'change-lang': 'Change global language',
                'manage-pw': 'Manage password',
                'change-pw': 'Change password',
                'about-elastos': 'About Essentials',
                'wallet-connect-sessions-intro-setting': 'Manage active sessions',
                'privacy-intro-setting': 'Customize your privacy level',

                // Other
                'light-mode-on': 'LIGHT MODE ON',
                'dark-mode-on': 'DARK MODE ON',
                'dark': 'DARK',
                'light': 'LIGHT',
                'log-out': 'Log Out',
                'help': 'Help',

                /********** About Page **********/
                'version': 'Version',
                'developer': 'Developer',
                'see-also': 'See Also',
                'visit': 'Visit',
                'join': 'Join',
                'build': 'Build',
                'contact': 'Contact',
                'new-version-available-notif-title': 'New version is available!',
                'new-version-available-notif-info': 'A new version of Essentials ({{ latestVersion }}) is available in your app store, update now to get the latest features and fixes!',
                'checking-updates': 'Checking updates...',
                'version-up-to-date': 'Your version is up to date.',
                'check-version-error': 'Failed to get latest version info. Please try again later.',
                'new-version-available': 'v{{ version }} available, touch to update.',
                'share-description': 'Share Essentials with others',
                'share-title': 'Here is Essentials link:',

                /********** Developer Page **********/
                'developer-options': 'Developer Options',
                'background-services-enabled': 'Background services enabled',
                'background-services-disabled': 'Background services disabled',
                'configure-network': 'Configure Network',
                'on': 'ON',
                'off': 'OFF',
                'developer-tools': 'Developer Tools',
                'developer-screen-capture': 'Allow screen capture',
                'developer-bitcoin-signdata': 'Allow bitcoin signData requests',
                'developer-bitcoin-signdata-prompt': "If you enable this setting, you might get signature requests that aren't readable. By signing a message you don't understand, you could be agreeing to give away your funds. You're at risk for phishing attacks. Protect youself by truning off signData.",
                'developer-logs': 'Capture logs',
                'developer-export-logs': 'Export captured logs',

                /********** Select-net Page **********/
                'choose-network': 'Choose Network',
                'test-net': 'Test Net',
                'main-net': 'Main Net',
                'reg-net': 'Regression net',
                'priv-net': 'Private Net',
                'lrw-net': 'LongRunWeather Net',
                'restart-prompt-info': 'This operation requires to restart',
                'restart-app': 'Restart Application',
                'restart-later': 'Restart later',

                /********** Wallet Connect / Sessions Page **********/
                'wallet-connect-request': 'App Link Request',
                'wallet-connect-sessions': 'Wallet Connect Sessions',
                'wallet-connect-prepare-to-connect': 'Initiating Wallet Connect',
                'wallet-connect-popup': 'Operation completed, please return to the original app.',
                'wallet-connect-session-disconnected': 'Wallet connect session disconnected',
                'wallet-connect-error': 'An external application just tried to send a request that cannot be understood by Essentials.',
                'raw-request': 'Raw request: ',
                'wallet-connect-request-loading': 'Getting ready to connect to an external app with Wallet Connect',
                'wallet-connect-request-error1': 'It seems like the link with the application cannot be established. Please ',
                'get-a-new-qr-code': 'get a new QR code',
                'wallet-connect-request-error2': ' from the calling application and scan it again.',
                'wallet-connect-request-error3': 'Connection seems to take a long time. You could cancel it and try again from the original app.',
                'wallet-connect-request-error4': 'Connection failed. You could try again from the original app.',
                'scan-again': 'Scan again',
                'wallet-connect-request-title': 'Wallet Connect Request',
                'wallet-connect-request-des': 'Would you like to open a session with the following external app?',
                'app-info': 'App Info',
                'name': 'Name',
                'description': 'Description',
                'url': 'URL',
                'wallet-accounts': 'Wallet accounts',
                'connect': 'Connect',
                'wallet-connect-no-session': 'No active session',
                'wallet-connect-no-session-info': 'There is currently no session with a third party app through Wallet Connect. Find the Wallet Connect button on your external app and scan the provided QR code using Essentials\' scanner to start.',
                'wallet-connect-no-address': "No active wallet, or active network is not compatible with Ethereum. This is not an error, but please make sure you are on the expected network. Some dApps may disconnect your Wallet Connect session because of this.",

                /********** Startup Screen Page **********/
                'startupscreen': 'Startup Screen',
                'startupscreen-home-title': 'Essentials Home',
                'startupscreen-home-description': 'Default home screen with all features and widgets.',
                'startupscreen-wallets-title': 'Wallets',
                'startupscreen-wallets-description': 'Shows your active wallet by default. If assets is what matters most for you.',
                'startupscreen-dapps-title': 'DApps Portal',
                'startupscreen-dapps-description': 'You can\'t stop browsing dApps all day long? This mode is for you.',

                /*********** Privacy page **********/
                'privacy': 'Privacy',

                'privacy-built-in-browser-title': 'Built-in browser',
                'privacy-use-builtin-browser': 'The Essentials built-in browser will be used to open dApps',
                'privacy-use-external-browser': 'dApps will be opened in external browser applications',
                'hive-data-sync': 'Data synchronization',
                'privacy-use-hive-data-sync': 'Use my Elastos Hive vault storage to save and restore personal data such as DID credentials or contacts list',
                'privacy-dont-use-hive-data-sync': 'Don\'t use my Elastos Hive vault storage to save and restore personal data',

                'identity-publishing': 'Identity Publishing',
                'publish-identity-medium-assist': 'Publish identity using a fast third party service named ASSIST',
                'publish-identity-medium-wallet': 'Publish identity by yourself using your wallet',

                'elastos-api-provider': 'Elastos API Provider',
                'elastos-api-provider-des': 'Select your preferred provider for all Elastos related services',
                'elastos-io-des': 'Set of Elastos APIs deployed and maintained by the Gelaxy team, also known as the Elastos blockchain team.',
                'trinity-tech-io-des': 'Set of Elastos APIs deployed and maintained by the Trinity Tech team, responsible for Elastos SDKs and Essentials developments.',

                'privacy-toolbox-stats': 'Credentials statistics',
                'privacy-send-credential-toolbox-stats': 'Send anonymous information about DID usage to the credential toolbox (a developer tool). The DID itself is never sent.',
                'privacy-dont-send-credential-toolbox-stats': 'Don\'t send anonymous information about DID usage to the credential toolbox (a developer tool).',

                'privacy-enable-creation-redpacket': 'Enable red packets',
                'privacy-enable-creation-redpacket-description': 'Enables the creation of red packets on the Elastos smart chain',
                'privacy-disable-creation-redpacket-description': 'Disables the creation of red packets on the Elastos smart chain',

                /*********** Elastos API provider page ***********/
                'elastosapiprovider': 'Elastos API'
        }

};


