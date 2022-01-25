export const fr = {
  'redpackets': {
    /**********
    * Generic *
    ***********/
    'red-packets': 'Paquets Rouges',
    'red-packet': 'Paquet Rouge',
    'view-all': 'Tout voir',
    'continue': 'Continuer',

    /*************
    * Components *
    **************/
    'expired': 'Expiré',
    'few-minutes-left': "Plus que quelques minutes",
    'n-hours-left': "Encore {{ hours }} heures",
    'n-days-left': "Encore {{ days }} jours",
    'enter-captcha-placeholder': 'Saisir le captcha pour ouvrir le paquet',
    'wrong-captcha': 'Mauvais captcha, essayez à nouveau',
    'error-captcha-is-required': 'Recopier le captcha pour continuer',
    'not-active-yet': 'Pas encore finalisé',
    'ip-rate-limitation': 'Hey, laissez quelques paquets pour les autres, attendez quelques minutes SVP',

    /*******
    * Home *
    ********/
    'public-packets': 'Paquets publics',
    'no-public-packet': 'Aucun paquet public pour le moment',
    'my-packets': 'Mes paquets',
    'create-new-packet': 'Create new packet',
    'no-my-packet': 'Vous n\'avez pas encore créé de paquets',
    'opened-packets': 'Paquets ouverts',
    'about-red-packets': 'A propos des paquets rouges',
    'about-red-packets-part-1': 'Traditionnellement utilisés en Chine pour célébrer certaines occasions et partager de la joie entre amis, les paquets rouges ("red packets") dans Essentials sont dérivés de cette idée pour célébrer, mais aussi pour créer de l\'animation au sein des communautés crypto.',
    'about-red-packets-part-2': 'Les paquets rouges sont plus fun que les "aidrops", avec une partie donnée au hasard et à la réactivité.',

    /*************
    * New packet *
    **************/
    'new-red-packet-title': 'Nouveau Paquet Rouge',
    'unsupported-network-intro': 'Les paquets rouges ne sont pas supportés sur ce réseau, veuillez en sélectionner un autre.',
    'quantity': 'Quantité',
    'quantity-hint': 'Nombre total de paquets que les utilisateurs peuvent obtenir.',
    'token': 'Jeton',
    'token-hint': 'Type de jeton obtenu par les utilisateurs en ouvrant les paquets.',
    'amount': 'Montant',
    'amount-hint': 'Nombre total de jetons distribués, équitablement ou aléatoirement.',
    'distribution': 'Distribution',
    'distribution-hint': 'Choisissez de donner les mêmes montants à tous, ou des montants aléatoires.',
    'distribution-fixed': 'Même montant dans tous les paquets',
    'distribution-random': 'Montants aléatoires',
    'distribution-random-info': '* Les gagnants recoivent un montant aléatoire d\'{{ token }}.',
    'distribution-fixed-info': '* Les gagnants recoivent tous {{ value }} {{ token }}.',
    'probability': 'Probabilité',
    'probability-hint': 'Probabilité d\'obtenir un paquet (s\il en reste). Après avoir perdu, un utilisateur ne peut pas essayer à nouveau.',
    'visibility': 'Visibilité',
    'visibility-hint': 'Choisissez de laisser uniquement les utilisateurs ayant le lien ouvrir le paquet, ou de rendre le paquet public. Les paquets publics s\'affichent sur l\'accueil d\'Essentials, peuvent être utilisés pour promouvoir un projet, et coûtent un peu plus cher.',
    'visibility-link-only': 'Utilisateurs avec le lien',
    'visibility-public': 'Public',
    'duration': 'Durée',
    'duration-hint': 'Après quelques jours, les paquets expirent et les montants restants vous sont retournés. Max 7 jours.',
    'expiration-days': 'Jours',
    'about-you': 'A propos de vous',
    'profile-hint': 'Si publié, votre avatar et nom seront visibles avec le paquet.',
    'message': 'Message',
    'packet-message-placeholder': 'Ex: Joyeuse année du tigre!',
    'theme': 'Thème',
    'theme-hint': 'Personnalisez l\'apparence des paquets ouvert, en fonction d\'occasions spéciales.',
    'theme-default': 'Par défault',
    'theme-christmas': 'Noël',
    'theme-summer_holidays': 'Vacances d\'été',
    'theme-cny': 'Nouvel an Chinois',
    'error-invalid-number-of-packets': 'Nombre de paquets invalide',
    'error-invalid-number-of-tokens': "Nomre de jetons invalide",
    'error-invalid-probability': "Probabilité invalide. Nombre entre 0 et 100",
    'error-invalid-expiration-time': "Durée invalide. Entre 1 et 7 jours",
    'error-no-message': "Soyez sympa, laissez un message...",
    'error-packet-creation-failed': "Le paquet n\'a pas pu être créé, réessayez plus tard.",
    'technical-preview-title': 'Note: Version de test',
    'technical-preview-info': 'Ce service de paquets rouges a été lancé récemment et est en période de test. Assurez-vous de n\'utiliser que de faibles montants de jetons.',

    /***********
    * Settings *
    ************/
    'settings-title': 'Paramètres',
    'profile-visibility': 'Visibilité de votre profil',
    'profile-visibility-hint': 'Attacher mon profil DID Elastos sur les paquets ouverts',

    /*****************
    * Packet details *
    ******************/
    'grabbing-packet': 'Récupération du paquet, un instant...',
    'packet-is-live': 'Votre paquet est prêt!',
    'packet-is-not-live': 'Votre paquet n\'est pas encore prêt!',
    'this-packet-is-not-live': 'Ce paquet n\'est pas encore disponible.',
    'packet-is-expired': 'Ce paquet a expiré',
    'error-retrieve-packet': 'Impossible d\'obtenir les informations du paquet. Veuillez réessayer plus tard.',
    'grab-me': 'Attrape moi!',
    'grab-packet': 'Attraper le paquet',
    'anonymous-offering': 'Un ami généreux offre des',
    'creator-offering': '<b>{{ creator }}</b> offre des',
    'grab-lost': 'Pas de chance cette fois ci!',
    'grab-too-late': 'Trop tard, quelqu\'un a été plus rapide pour attraper celui ci, plus de paquets...',
    'grab-too-late-2': 'Trop tard, plus de paquets...',
    'information': 'Informations',
    'distributed-packets': 'Paquets',
    'n-packets': '{{ packets }} paquets',
    'distributed-tokens': 'Jetons',
    'n-tokens': '{{ tokens }} {{ symbol }}',
    'distribution-model': 'Type',
    'probability-to-win': 'Probabilité de gain',
    'most-recent-winners': 'Gagnants récents',
    'fetching-winners': 'Récupération des gagnants',
    'no-winner': 'Tous les gagnants seront affichés ici',
    'complete-payment': 'Finaliser le paiement',
    'date-time-at': 'à',
    'creator-sent-you': '{{ creator }} vous a envoyé',
    'random': 'Aléatoire',
    'fixed-amounts': 'Montants fixes',
    'anonymous': "Anonyme",
    'packet-url-copied': "URL du paquet copiée dans le presse-papier, vous pouvez maintenant partager!",
    'packet-share-title': "Un paquet rouge pour toi!",
    'got-it': 'Paquet attrapé! Les jetons arriveront dans votre portefeuille sous peu',
    'copy-link': 'Copy link',
    'share-link': 'Share link',

    /******
    * Pay *
    *******/
    'payment-title': 'Paiement',
    'getting-packet-info': 'Récupération des infos du paquet, un instant',
    'balance-not-enough': 'Votre balance actuelle de {{ currentTokens }} {{ symbol }} est insuffisante pour payer {{ targetTokens }} {{ symbol }}',
    'process': 'Etapes',
    'step-n': 'Etape {{ step }}',
    'send-n-tokens': 'Envoi de {{ amount }} {{ symbol }}',
    'n-tokens-sent': '{{ amount }} {{ symbol }} envoyés!',
    'payment-confirmation-error': 'Le paiement n\'a pas pu être confirmé. Ce paquet a été annulé et les fonds vous seront retournés. Raison: ',
    'balance-n-tokens': 'Balance: {{ amount }} {{ symbol }}',
    'packet-is-live-pay': 'Le paquet rouge est prêt',
    'total-symbol': 'Total d\'{{ symbol }}',
    'transaction-fees': 'Frais de transactions',
    'service-fees': 'Frais de service',
    'public-option-fees': 'Option: paquet public',
    'note': 'Note',
    'unspent-tokens-refunded': 'Les jetons non dépensés vous seront retournés une fois le paquet rouge expiré.',
    'view-packet': 'Voir le paquet',
    'base-service-fee-info': 'Frais de service de {{ baseFee }}$, payés en {{ symbol }}.',
    'public-service-fee-info': 'Option paquet public à {{ publicFee }}$, payée en {{ symbol }}, plus {{ publicFeePercentage }}% du total des {{ packetSymbol }} dans le paquet.',
    'transaction-fees-info': 'Les frais de transactions sont estimés en fonction du nombre de paquets à distribuer aux gagnants.'
  }
}