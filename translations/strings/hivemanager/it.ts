export const it = {

    'hivemanager': {
      /********** Prompts **********/
      "toast.provide-name": "Si prega di fornire un nome al provider",
      "toast.provide-name-update": "Nome del provider aggiornato",
      "toast.provide-name2": "Per favore aggiungi un nome al tuo provider",
      "toast.copied": "Copiato negli appunti!",
      "alert.delete-title": "Conferma Cancellazione",
      "alert.delete-msg": "Sei sicuro di voler eliminare questa configurazione?",
      "alert.okay": "Okay",
      "alert.delete": "Elimina",
      "alert.confirm": "Conferma",
      "alert.cancel": "Annulla",
      "alert.not-available": "Non ancora disponibile",
      "alert.not-available-msg": "Questa funzione non è attualmente disponibile in Hive. Prossimamente: Trasferisci tutti i tuoi dati a un altro provider di archiviazione in qualsiasi momento. Preparati ad avere il controllo dei tuoi dati!",
      "alert.error": "Errore",
      "alert.sorry-provider-not-save": "Spiacenti, al momento non è stato possibile salvare il provider di archiviazione. ",
      "alert.ok": "Ok",
      "alert.unavailable": "Non disponibile",
      "alert.only-payments-in-ELA": "Spiacenti, al momento sono supportati solo i pagamenti in ELA",
      "alert.completed": "Completato",
      "alert.plan-has-been-configured": "Il tuo piano è stato configurato con successo",
      "alert.operation-not-completed-title": "Operazione non completata",
      "alert.operation-not-completed-text": "Il tuo piano di archiviazione rimane invariato: l'operazione è stata annullata o il pagamento non è andato a buon fine.",
      "alert.didpublish-title": 'La DID non è stata pubblicata',
      "alert.didpublish-msg": 'La DID non è stata ancora pubblicata. Vuoi pubblicarla ora? <br/><br/>Dopo la pubblicazione, attendi qualche minuto e riprova.',
      "token-revoked": "Token di autenticazione revocato",
  
      /********** Screens **********/
      "signin": {
        "title": "Per favore accedi",
        "intro": 'Abbiamo bisogno della tua identità per gestire il tuo spazio di archiviazione su Hive.',
        "signin": 'Accedi',
        "publish-now": 'Pubblica ora',
        "didpublish": 'Pubblicazione Identità',
        "didpublish-msg": 'La tua identità non è stata trovata nel registro pubblico (blockchain). Assicurati di pubblicare prima la tua identità con la capsula dell\'identità. Sei libero di non rendere pubbliche le informazioni, ma il tuo DID deve essere pubblicato.',
        "didpublish-msg2": 'After publishing, please wait a few minutes to retry signing in here.',
      },
      "pickprovider": {
        "title": "Il tuo provider di archiviazione",
        "please-wait": "Per favore aspetta un momento,",
        "checking-status": "Stiamo controllando il tuo stato...",
        "activating-provider": "Attivazione del provider",
        "hivevault-publishing": "Il collegamento al tuo nuovo provider di archiviazione Hive è attualmente in fase di pubblicazione. Attendi qualche minuto per poter utilizzare lo spazio di archiviazione.",
        "elastos": "Elastos",
        "hivestorage": "Archiviazione Hive",
        "no-storage-intro": "Sembra che tu non abbia ancora un provider di archiviazione Hive. Sentiti libero di utilizzare qualsiasi provider personale o commerciale di tua scelta. Per comodità, ecco alcuni provider di archiviazione predefiniti che puoi scegliere.",
        "no-storage-intro2": "In questa prima versione di Hive, non puoi trasferire i tuoi dati. Dopo aver scelto il tuo provider di dati, dovrai attendere le versioni future di hive per poter trasferire i dati da qualche altra parte.",
        "please-note": "Notare che:",
        "select-provider": "Selezionare Provider",
        "input-provider": "O inserisci manualmente un provider",
        "use-address": "Usa questo indirizzo personalizzato",
        "provider-offline": "Provider di archiviazione è offline?",
        "provider-offline-msg": "Non è stato possibile contattare il tuo attuale provider di spazio di archiviazione. Potrebbe trattarsi di un problema temporaneo, in questo caso riprova più tardi. In caso contrario, potrebbe essere necessario trasferire manualmente il backup dei dati a un nuovo provider.",
        "vault-active": "Archiviazione attivata",
        "vault-msg": "Hai già scelto un provider di archiviazione. Per ora non puoi modificarlo fino a quando le future versioni di hive non ti consentiranno di modificare la posizione di archiviazione in qualsiasi momento.",
        "address": "Indirizzo:",
        "version": "Versione:",
        "not-available-yet": "Non ancora disponibile",
        "transfer-vault": "Trasferisci dati archiviati",
        "primary-plan": "Piano di archiviazione principale",
        "retrieving-plan": "recupera il tuo piano attuale",
        "choose-another-plan": "Scegli un altro piano di archiviazione",
        "payment-processing": "Il tuo pagamento precedente è ancora in fase di elaborazione, potrai passare a un altro piano solo dopo che l'operazione sarà stata completata.",
        "backup-provider": "Backup Provider",
        "backup-provider-msg": "La funzione di backup/ripristino non è ancora disponibile. Presto sarai in grado di scegliere un provider di backup per clonare il tuo spazio di archiviazione e assicurarti che i tuoi dati siano al sicuro anche se il tuo provider principale un giorno non fosse più disponibile.",
        "backup-plan": "Piano di archiviazione di backup",
        "backup-plan-msg": "Nessun provider di backup ancora disponibile.",
        "pending-orders": "Ordini in attesa",
        "retrieving-orders": "recupera gli ordini",
        "no-pending-order": "Nessun ordine in sospeso."
      },
      "pickplanpurchase": {
        "title": "Confermare l'acquisto",
        "confirm-plan": "Conferma piano",
        "purchase-msg": "Stai per utilizzare questo piano come nuovo piano di archiviazione. Si prega di verificare che tutto sia corretto e procedere al pagamento.",
        "purchase-now": "Acquista adesso",
      },
      "pickplan": {
        "title": "Scegli un piano di archiviazione",
        "please-wait": "Attendere, richiesta piani di archiviazione dal provider del vault...",
        "choose-plan": "Scegli un Piano",
        "choose-plan-msg": "Ecco i piani di archiviazione disponibili su questo provider di vault. Scegline uno e procedi al pagamento se necessario.",
        "plans": "Piani",
        "no-storage-found": "Nessun piano di archiviazione trovato.",
      },
      "adminproviderlist": {
        "title": "Gestisci i miei Providers",
        "no-providers": "I tuoi Provider di Vault saranno elencati qui.",
        "providers-msg": "Di seguito è riportato un elenco di Provider di Vault che stai gestendo, non utilizzando.",
        "providers-msg2": 'Questo è destinato solo agli amministratori del Provider di Vault, non ai normali utenti finali.'
      },
      "adminprovideredit": {
        "title": "Modifica Provider",
        "provider-name": "Nome del Provider",
        "enter-name": "Inserisci un nome",
        "create": "Crea",
        "admin-id": "Identità dell'Admin",
        "admin-mnemonic": "Frase Mnemonica dell'Admin",
        "delete": "Elimina",
        "publish": "Pubblica",
      },
      "order": {
        "id": "ID:",
        "plan": "Piano:",
        "state": "Stato:",
        "date": "Data di acquisto:",
      },
      "payment-plan": {
        "max-storage": "Archiviazione Massima:",
        "cost": "Costo:",
        "days": "giorni",
        "free": "Gratis",
        "file-storage": "Archiviazione file in uso:",
        "data-storage": "Archiviazione del database in uso:",
        "start-time": "Ora di inizio:",
      },
  
      "hive-menu": {
        "vault-providers-administration": "Vault Providers Administration",
        "force-provider-change": "[Caution!] Force provider change",
        "revoke-auth-token": "Revoke hive vault auth token"
      },
    }
    
  };
  
  
  