export const zh = {
  'redpackets': {
    /**********
    * Generic *
    ***********/
    'red-packets': 'Red Packets',
    'red-packet': 'Red Packet',
    'view-all': 'View all',
    'continue': 'Continue',

    /*************
    * Components *
    **************/
    'expired': 'Expired',
    'few-minutes-left': "A few minutes left",
    'n-hours-left': "{{ hours }} hours left",
    'n-days-left': "{{ days }} days left",
    'enter-captcha-placeholder': 'Enter the captcha to open packet',
    'wrong-captcha': 'Wrong captcha, please try again',

    /*******
    * Home *
    ********/
    'public-packets': 'Public packets',
    'no-public-packet': 'No public packets available at the moment',
    'my-packets': 'My packets',
    'create-new-packet': 'Create new packet',
    'no-my-packet': 'You haven\'t created any packet yet',
    'opened-packets': 'Opened packets',
    'about-red-packets': 'About Red Packets',
    'about-red-packets-part-1': 'Traditionally used in China to celebrate special occasions and share happiness among friends, red packets are derived from this idea in Elastos Essentials to celebrate, but also to create entertainment for crypto communities.',
    'about-red-packets-part-2': 'Red packets introduce much more fun compared to “airdrops”, as luck and reactivity are involved.',

    /*************
    * New packet *
    **************/
    'new-red-packet-title': 'New Red Packet',
    'unsupported-network-intro': 'Red packets are unsupported for this network. Please select another one.',
    'quantity': 'Quantity',
    'quantity-hint': 'Total number of packets that can be grabbed by others.',
    'token': 'Token',
    'token-hint': 'Type of token won by users when opening red packets.',
    'amount': 'Amount',
    'amount-hint': 'Total number of tokens that will be distributed randomly or equally.',
    'distribution': 'Distribution',
    'distribution-hint': 'Choose to give the same number of tokens to all users, or random amounts.',
    'distribution-fixed': 'Same value in all packets',
    'distribution-random': 'Random packet values',
    'distribution-random-info': '* Winning users will receive random amounts of {{ token }}.',
    'distribution-fixed-info': '* All winning users will receive {{ value }} {{ token }}.',
    'probability': 'Probability',
    'probability-hint': 'If there are remaining packets, probability to get one. After losing, a user cannot try again.',
    'visibility': 'Visibility',
    'visibility-hint': 'Choose to let only users with the packet link grab packets, or make your red packet public. Public red packets appear on the Essentials home screen, can be used to promote a project, but cost a bit more.',
    'visibility-link-only': 'Users with link only',
    'visibility-public': 'Public',
    'duration': 'Duration',
    'duration-hint': 'After a few days, the red packet becomes inactive and unspent funds are returned to you. Max 7 days.',
    'expiration-days': 'Days',
    'about-you': 'About you',
    'profile-hint': 'If published, your avatar and name will be seen by others.',
    'message': 'Message',
    'theme': 'Theme',
    'theme-hint': 'Choose to customize the visual appearance of opened red packets, for special events.',
    'theme-default': 'Default',
    'theme-christmas': 'Christmas',
    'theme-summer_holidays': 'Summer Holidays',
    'theme-cny': 'Chinese New Year',
    'error-invalid-number-of-packets': 'Invalid number of packets',
    'error-invalid-number-of-tokens': "Invalid number of tokens to distribute",
    'error-invalid-probability': "Invalid probability. Use a 0-100 value",
    'error-invalid-expiration-time': "Invalid expiration time. Use 1-7 days",
    'error-no-message': "Be kind with your people, send them a nice message!",
    'error-packet-creation-failed': "The packet could not be created. Please try again later",
    'technical-preview-title': 'Note: Technical Preview',
    'technical-preview-info': 'The red packet service was recently launched and is this is still a technical release. Make sure to create only red packets with small amounts of tokens.',

    /***********
    * Settings *
    ************/
    'settings-title': 'Settings',
    'profile-visibility': 'Profile Visibility',
    'profile-visibility-hint': 'Send my Elastos DID profile when grabbing red packets',

    /*****************
    * Packet details *
    ******************/
    'grabbing-packet': 'Trying to grab a packet... Please wait',
    'packet-is-live': 'Your packet is now live!',
    'packet-is-not-live': 'Your packet is not live yet!',
    'packet-is-expired': 'This packet is expired',
    'error-retrieve-packet': 'Unable to retrieve red packet information, please retry later.',
    'grab-me': 'Grab me!',
    'grab-packet': 'Grab packet',
    'anonymous-offering': 'A generous anonymous friend is offering some',
    'creator-offering': '<b>{{ creator }}</b> is offering some',
    'grab-lost': 'No luck this time!',
    'grab-too-late': 'Too late, someone was faster at grabbing this one, no more packets...',
    'grab-too-late-2': 'Too late, no more packets...',
    'information': 'Information',
    'distributed-packets': 'Packets',
    'n-packets': '{{ packets }} packets',
    'distributed-tokens': 'Tokens',
    'n-tokens': '{{ tokens }} {{ symbol }}',
    'distribution-model': 'Model',
    'probability-to-win': 'Probability to win',
    'most-recent-winners': 'Most Recent Winners',
    'fetching-winners': 'Getting the winners',
    'no-winner': 'All the winners will be listed here',
    'complete-payment': 'Complete payment',
    'date-time-at': 'at',
    'creator-sent-you': '{{ creator }} sent you',
    'random': 'Random',
    'fixed-amounts': 'Fixed amounts',
    'anonymous': "Anonymous",
    'packet-url-copied': "Packet URL copied to clipboard, you can now share it!",
    'packet-share-title': "A red packet for you!",
    'got-it': 'You\'ve grabbed a packet! Tokens will arrive in your wallet soon',

    /******
    * Pay *
    *******/
    'payment-title': 'Payment',
    'getting-packet-info': 'Getting packet information, please wait',
    'balance-not-enough': 'Current balance of {{ currentTokens }} {{ symbol }} is not enough to pay {{ targetTokens }} {{ symbol }}',
    'process': 'Process',
    'step-n': 'Step {{ step }}',
    'send-n-tokens': 'Send {{ amount }} {{ symbol }}',
    'n-tokens-sent': '{{ amount }} {{ symbol }} sent!',
    'payment-confirmation-error': 'The payment could not be confirmed. This red packet will be cancelled and refunded, please try to create another. Reason: ',
    'balance-n-tokens': 'Balance: {{ amount }} {{ symbol }}',
    'packet-is-live-pay': 'The Red Packet is live',
    'total-symbol': 'Total {{ symbol }}',
    'transaction-fees': 'Transaction fees',
    'service-fees': 'Service Fees',
    'public-option-fees': 'Option: public packet',
    'note': 'Note',
    'unspent-tokens-refunded': 'Unspent tokens and provisionning fees are returned at the expiration of the red packet.',
    'view-packet': 'View packet'
  }
}