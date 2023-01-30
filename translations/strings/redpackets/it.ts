export const it = {
  'redpackets': {
    /**********
    * Generic *
    ***********/
    'red-packets': 'Red Packets',
    'red-packet': 'Red Packet',
    'view-all': 'Mostra tutto',
    'continue': 'Continua',

    /*************
    * Components *
    **************/
    'expired': 'Scaduto',
    'few-minutes-left': "Mancano pochi minuti",
    'n-hours-left': "{{ hours }} ore rimaste",
    'n-days-left': "{{ days }} giorni rimasti",
    'enter-captcha-placeholder': 'Inserisci il captcha per aprire il pacchetto',
    'wrong-captcha': 'Captcha errato, riprova',
    'error-captcha-is-required': 'Digita il captcha per continuare',
    'not-active-yet': 'Non ancora attivo',
    'ip-rate-limitation': 'Ehi, non prendere i pacchetti troppo in fretta, attendi qualche minuto',

    /*******
    * Home *
    ********/
    'public-packets': 'Pacchetti pubblici',
    'no-public-packet': 'Nessun pacchetto pubblico disponibile al momento',
    'my-packets': 'I miei pacchetti',
    'create-new-packet': 'Crea un nuovo pacchetto',
    'no-my-packet': 'Non hai ancora creato nessun pacchetto',
    'opened-packets': 'Pacchetti aperti',
    'about-red-packets': 'Informazioni sui Red Packets',
    'about-red-packets-part-1': 'Tradizionalmente utilizzati in Cina per celebrare occasioni speciali e condividere la felicità tra amici, i Red Packets derivano da questa idea e sono stati inseriti in Essentials per celebrare, ma anche per creare intrattenimento per le comunità Crypto.',
    'about-red-packets-part-2': 'I Red Packets introducono molto più divertimento rispetto ai comuni "airdrop", poiché viene coinvolta la fortuna e la reattività.',

    /*************
    * New packet *
    **************/
    'new-red-packet-title': 'Nuovi Red Packet',
    'unsupported-network-intro': 'I Red packets non sono supportati per questa rete. Selezionane un altro.',
    'unsupported-wallet-intro': 'I Red packets non sono supportati per questa portafoglio. Selezionane un altro.',
    'quantity': 'Quantità',
    'quantity-hint': 'Numero totale dei pacchetti che possono essere presi dagli utenti.',
    'token': 'Token',
    'token-hint': 'Token che gli utenti vinceranno all\'apertura dei Red Packets.',
    'amount': 'Importo',
    'amount-hint': 'Numero totale di token che verranno distribuiti casualmente o equamente.',
    'distribution': 'Distribuzione',
    'distribution-hint': 'Scegli di dare lo stesso numero di token a tutti gli utenti o degli importi casuali.',
    'distribution-fixed': 'Stesso valore in tutti i pacchetti',
    'distribution-random': 'Valori dei pacchetti casuali',
    'distribution-random-info': '* I vincitori riceveranno importi casuali di {{ token }}.',
    'distribution-fixed-info': '* Tutti i vincitori riceveranno {{ value }} {{ token }}.',
    'probability': 'Probabilità',
    'probability-hint': 'Probabilità di ottenere dei token all\'apertura dei pacchetti. Dopo aver perso, un utente non può riprovare.',
    'visibility': 'Visibilità',
    'visibility-hint': 'Scegli di consentire solo agli utenti con il link del pacchetto di prendere i pacchetti o di rendere pubblico il tuo Red Packet. I Red Packets pubblici vengono visualizzati nella schermata principale di Essentials, possono essere utilizzati per promuovere un progetto, ma costano un po\' di più.',
    'visibility-link-only': 'Solo utenti con link',
    'visibility-public': 'Pubblico',
    'duration': 'Durata',
    'duration-hint': 'Dopo alcuni giorni, il Red Packet diventa inattivo e i fondi non spesi ti vengono restituiti. Massimo 7 giorni.',
    'expiration-days': 'Giorni',
    'about-you': 'A proposito di te',
    'profile-hint': 'Se pubblicati, il tuo avatar ed il tuo nome saranno visibili agli altri.',
    'message': 'Messaggio',
    'packet-message-placeholder': 'Felice Capodanno Cinese a te',
    'theme': 'Tema',
    'theme-hint': 'Scegli di personalizzare l\'aspetto dei Red Packets aperti.',
    'theme-default': 'Predefinito',
    'theme-christmas': 'Natalizio',
    'theme-summer_holidays': 'Vacanze estive',
    'theme-cny': 'Capodanno Cinese',
    'error-invalid-number-of-packets': 'Numero di pacchetti non valido',
    'error-invalid-number-of-tokens': "Numero di token da distribuire non valido",
    'error-invalid-probability': "Probabilità non valida. Usa un valore da 0 a 100",
    'error-invalid-expiration-time': "Scadenza non valida. Puoi scegliere tra 1 e 7 giorni",
    'error-no-message': "Sii gentile con le persone, manda loro un bel messaggio!",
    'error-message-too-long': 'Your message is too long (max 200)',
    'error-packet-creation-failed': "Impossibile creare il pacchetto. Si prega di riprovare più tardi",
    'technical-preview-title': 'Nota: Anteprima in fase Beta',
    'technical-preview-info': 'Il servizio Red Packet è stato lanciato di recente e questa è ancora una versione in fase Beta. Assicurati di creare solo pacchetti con piccole quantità di token.',

    /***********
    * Settings *
    ************/
    'settings-title': 'Settings',
    'profile-visibility': 'Profile Visibility',
    'profile-visibility-hint': 'Send my Elastos DID profile when grabbing red packets',

    /*****************
    * Packet details *
    ******************/
    'grabbing-packet': 'Tentativo di prendere un pacchetto... Attendi',
    'packet-is-live': 'Il tuo pacchetto è ora online!',
    'packet-is-not-live': 'Il tuo pacchetto non è ancora attivo!',
    'this-packet-is-not-live': 'Questo pacchetto non è ancora attivo',
    'packet-is-expired': 'Questo pacchetto è scaduto',
    'error-retrieve-packet': 'Impossibile recuperare le informazioni di questo Red Packet, riprovare più tardi.',
    'grab-me': 'Afferrami!',
    'grab-packet': 'Prendi il pacchetto',
    'anonymous-offering': 'Un generoso amico anonimo ne offre alcuni',
    'anonymous-offered-you': 'Un generoso amico anonimo te l\'ha appena offerto',
    'creator-offering': '<b>{{ creator }}</b> ne offre alcuni',
    'grab-lost': 'Niente fortuna stavolta!',
    'grab-too-late': 'Troppo tardi, qualcuno è stato più veloce a prenderli, niente più pacchetti...',
    'grab-too-late-2': 'Troppo tardi, niente più pacchetti...',
    'information': 'Informazione',
    'distributed-packets': 'Pacchetti',
    'n-packets': '{{ packets }} pacchetti',
    'distributed-tokens': 'Tokens',
    'n-tokens': '{{ tokens }} {{ symbol }}',
    'distribution-model': 'Modello',
    'probability-to-win': 'Probabilità di vittoria',
    'most-recent-winners': 'Vincitori più recenti',
    'fetching-winners': 'Ricerca dei vincitori',
    'no-winner': 'Tutti i vincitori saranno elencati qui',
    'complete-payment': 'Pagamento completo',
    'date-time-at': 'in',
    'creator-sent-you': '{{ creator }} ti ha inviato',
    'you-grabbed': 'Congratulazioni, hai vinto',
    'random': 'Casuale',
    'fixed-amounts': 'Importi fissi',
    'anonymous': "Anonimo",
    'packet-url-copied': "URL del pacchetto copiato negli appunti, ora puoi condividerlo!",
    'packet-share-title': "Un Red Packet per te!",
    'got-it': 'Hai preso un pacchetto! I token arriveranno presto nel tuo portafoglio',
    'copy-link': 'Copia link',
    'share-link': 'Condividi link',
    'no-user-wallet': 'Al momento non hai alcun portafoglio. Crea o importa un portafoglio in Essentials per prendere i pacchetti o per creare i tuoi pacchetti.',
    'packet-cancelled': 'Questo pacchetto è stato cancellato, probabilmente a causa di un errore del pagamento. I fondi verranno restituiti o sono già stati restituiti al creatore del pacchetto.',
    'test-network-title': 'This is a test network!',
    'test-network-info': 'This red packet was created on a test network. Tokens will be transferred but have no value. Make sure to share this packet only with testers.',

    /******
    * Pay *
    *******/
    'payment-title': 'Pagamento',
    'getting-packet-info': 'Ricerca delle informazioni sul pacchetto, attendi',
    'balance-not-enough': 'Il saldo attuale di {{ currentTokens }} {{ symbol }} non è sufficiente per pagare {{ targetTokens }} {{ symbol }}',
    'process': 'Processo',
    'step-n': 'Passo {{ step }}',
    'send-n-tokens': 'Invia {{ amount }} {{ symbol }}',
    'n-tokens-sent': '{{ amount }} {{ symbol }} inviati!',
    'payment-confirmation-error': 'Non è stato possibile confermare il pagamento. Questo Red Packet verrà annullato e rimborsato, prova a crearne un altro. Motivo: ',
    'balance-n-tokens': 'Bilancio: {{ amount }} {{ symbol }}',
    'packet-is-live-pay': 'Il Red Packet è online',
    'total-symbol': 'Totale {{ symbol }}',
    'transaction-fees': 'Commissioni della transazione',
    'service-fees': 'Commissione del servizio',
    'public-option-fees': 'Opzione: pacchetto pubblico',
    'note': 'Nota',
    'unspent-tokens-refunded': 'I token non spesi e le commissioni del servizio vengono restituiti alla scadenza del Red Packet.',
    'view-packet': 'Visualizza pacchetto',
    'base-service-fee-info': 'Commissione del servizio base di ${{ baseFee }}, pagata in {{ symbol }}.',
    'public-service-fee-info': 'Opzione aggiuntiva pacchetto pubblico a ${{ publicFee }}, pagata in {{ symbol }}, più {{ publicFeePercentage }}% del totale di {{ packetSymbol }} nel pacchetto.',
    'transaction-fees-info': 'Le commissioni della transazione sono stimate in base al numero di pacchetti che il servizio invierà ai vincitori.'
  }
}
