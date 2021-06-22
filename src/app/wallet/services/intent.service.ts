import { Native } from './native.service';
import { Util } from '../model/Util';
import { StandardCoinName } from '../model/Coin';
import { Injectable } from '@angular/core';
import { CoinService } from './coin.service';
import { CoinTransferService, TransferType } from './cointransfer.service';
import { WalletAccessService } from './walletaccess.service';
import { WalletManager } from './wallet.service';
import { MasterWallet } from '../model/wallets/MasterWallet';
import { WalletEditionService } from './walletedition.service';
import { PopupProvider } from './popup.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Logger } from 'src/app/logger';
import { Subscription } from 'rxjs';
import { Events } from 'src/app/services/events.service';
import { AddERCTokenRequestParams } from '../model/adderctokenrequest';

export enum ScanType {
  Address     = 1,
  Publickey   = 2,
  PrivateKey  = 3,
}


@Injectable({
    providedIn: 'root'
})
export class IntentService {
    private walletList: MasterWallet [] = null;
    private subscription: Subscription = null;
    private nextScreen = '';

    constructor(
        public events: Events,
        public native: Native,
        private walletManager: WalletManager,
        private coinService: CoinService,
        private coinTransferService: CoinTransferService,
        private popupProvider: PopupProvider,
        private walletAccessService: WalletAccessService,
        private walletEditionService: WalletEditionService,
        private globalIntentService: GlobalIntentService,
    ) {
    }

    public async init() {
        Logger.log("wallet", "IntentService init");

        // Listen to incoming intents.
        this.addIntentListener();
    }

    public stop() {
        this.removeIntentListener();
    }

    addIntentListener() {
        this.subscription = this.globalIntentService.intentListener.subscribe((receivedIntent) => {
            if (!receivedIntent)
                return;

            this.onReceiveIntent(receivedIntent);
        });
    }

    removeIntentListener() {
      if (this.subscription) {
        this.subscription.unsubscribe();
        this.subscription = null;
      }
    }

    async onReceiveIntent(intent: EssentialsIntentPlugin.ReceivedIntent) {
        if (intent.action.indexOf("https://wallet.elastos.net/") != 0)
            return; // Not for us.

        this.walletList = this.walletManager.getWalletsList();
        if (this.walletList.length === 0) {
            this.native.setRootRouter('/wallet/launcher');
            const toCreateWallet = await this.popupProvider.ionicConfirm('wallet.intent-no-wallet-title', 'wallet.intent-no-wallet-msg', 'common.ok', 'wallet.exit');
            if (toCreateWallet) {
                // TODO
                // Should call sendIntentResponse?
            }  else {
                // sendIntentResponse will exit current context, so must call setRootRouter('/wallet/launcher') first.
                await this.globalIntentService.sendIntentResponse({message: 'No active master wallet!', status: 'error'}, intent.intentId);
            }
            return false;
        }

        switch (this.getShortAction(intent.action)) {
            case 'adderctoken':
                this.handleAddCoinIntent(intent);
                break;
            case 'elawalletmnemonicaccess':
            case 'walletaccess':
                // TODO @chad titleBarManager.setNavigationMode(TitleBarPlugin.TitleBarNavigationMode.CLOSE);
                this.handleAccessIntent(intent);
                break;
            default:
                // TODO @chad titleBarManager.setNavigationMode(TitleBarPlugin.TitleBarNavigationMode.CLOSE);
                this.handleTransactionIntent(intent);
                break;
        }
    }

    /**
     * From a full new-style action string such as https://wallet.elastos.net/pay,
     * returns the short old-style action "pay" for convenience.
     */
    private getShortAction(fullAction: string): string {
        const intentDomainRoot = "https://wallet.elastos.net/";
        return fullAction.replace(intentDomainRoot, "");
    }

    /**
     * Compatibility. Some intent from External app maybe use string
     * @param param
     */
    private getNumberFromParam(param) : number{
        if (typeof param === 'string')  {
            return parseFloat(param);
        } else {
            return param;
        }
    }

    async handleTransactionIntent(intent: EssentialsIntentPlugin.ReceivedIntent) {
        if (Util.isEmptyObject(intent.params)) {
            Logger.error('wallet', 'Invalid intent parameters received. No params.', intent.params);
            await this.globalIntentService.sendIntentResponse("Invalid intent parameters", intent.intentId);
            return false;
        } else {
            this.coinTransferService.reset();
            this.coinTransferService.chainId = StandardCoinName.ELA;
            this.coinTransferService.intentTransfer = {
                action: this.getShortAction(intent.action),
                intentId: intent.intentId
            };
        }

        let intentRequiresWalletSelection = true; // User must select a walelt first before doing the real action
        let navigationState = {};
        switch (this.getShortAction(intent.action)) {
            case 'crmembervote':
                Logger.log("wallet", 'CR member vote Transaction intent content:', intent.params);
                this.nextScreen = '/wallet/intents/crmembervote';
                this.coinTransferService.transfer.votes = intent.params.votes;
                break;

            case 'crmemberregister':
                Logger.log("wallet", 'CR member register Transaction intent content:', intent.params);
                this.nextScreen = '/wallet/intents/crmemberregister';
                this.coinTransferService.transfer.did = intent.params.did;
                this.coinTransferService.transfer.nickname = intent.params.nickname;
                this.coinTransferService.transfer.url = intent.params.url;
                this.coinTransferService.transfer.location = intent.params.location;
                break;

            case 'crmemberupdate':
                Logger.log("wallet", 'CR member update Transaction intent content:', intent.params);
                this.nextScreen = '/wallet/intents/crmemberregister';
                this.coinTransferService.transfer.nickname = intent.params.nickname;
                this.coinTransferService.transfer.url = intent.params.url;
                this.coinTransferService.transfer.location = intent.params.location;
                break;

            case 'crmemberunregister':
                Logger.log("wallet", 'CR member unregister Transaction intent content:', intent.params);
                this.nextScreen = '/wallet/intents/crmemberregister';
                this.coinTransferService.transfer.crDID = intent.params.crDID;
                break;

            case 'crmemberretrieve':
                Logger.log("wallet", 'CR member retrieve Transaction intent content:', intent.params);
                this.nextScreen = '/wallet/intents/crmemberregister';
                this.coinTransferService.chainId = StandardCoinName.IDChain;
                this.coinTransferService.transfer.amount = this.getNumberFromParam(intent.params.amount);
                this.coinTransferService.transfer.publickey = intent.params.publickey;
                break;

            case 'dposvotetransaction':
                Logger.log("wallet", 'DPOS Transaction intent content:', intent.params);
                this.nextScreen = '/wallet/intents/dposvote';
                this.coinTransferService.publickeys = intent.params.publickeys;
                break;

            case 'didtransaction':
                this.nextScreen = '/wallet/intents/didtransaction';
                this.coinTransferService.chainId = StandardCoinName.IDChain;
                this.coinTransferService.didrequest = intent.params.didrequest;
                break;

            case 'esctransaction':
                this.nextScreen = '/wallet/intents/esctransaction';
                this.coinTransferService.chainId = StandardCoinName.ETHSC;
                this.coinTransferService.payloadParam = intent.params.payload.params[0];
                // this.coinTransferService.amount = intent.params.amount;

                if (this.coinTransferService.payloadParam.from) {
                    Logger.log("wallet", "Auto-selecting wallet with ETH address "+this.coinTransferService.payloadParam.from+" as requested by the 'from' field");

                    // If the "from" address is set, this means the received raw transaction is already
                    // for a specific account. In this case we auto-select the related wallet without asking user.
                    let escWallet: MasterWallet = this.walletManager.findMasterWalletBySubWalletID(StandardCoinName.ETHSC);
                    this.coinTransferService.masterWalletId = escWallet.id;
                    this.coinTransferService.walletInfo = escWallet.account;
                    intentRequiresWalletSelection = false;
                }

                break;

            case 'pay':
                this.nextScreen = '/wallet/coin-transfer';
                const intentChainId = this.getChainIDByCurrency(intent.params.currency || 'ELA');
                if (intentChainId) {
                    this.coinTransferService.chainId = intentChainId;
                } else {
                    await this.globalIntentService.sendIntentResponse(
                        { message: 'Not support Token:' + intent.params.currency, status: 'error' },
                        intent.intentId
                    );

                    return;
                }

                this.coinTransferService.transferType = TransferType.PAY;
                this.coinTransferService.payTransfer = {
                    toAddress: intent.params.receiver,
                    amount: this.getNumberFromParam(intent.params.amount),
                    memo: intent.params.memo || ""
                };
                break;

            case 'crproposalcreatedigest':
                this.handleCreateProposalDigestIntent(intent);
                // TODO
                Logger.error('wallet', 'crproposalcreatedigest Not implemented');
                break;

            case 'crproposalvoteagainst':
                this.nextScreen = '/wallet/intents/crproposalvoteagainst';
                this.handleVoteAgainstProposalIntent(intent);
                break;

            default:
                Logger.log("wallet", 'IntentService unknown intent:', intent);
                return;
        }

        if (intentRequiresWalletSelection) {
            if (this.walletList.length === 1) {
                const masterWallet = this.walletList[0];
                this.coinTransferService.masterWalletId = masterWallet.id;
                this.coinTransferService.walletInfo = masterWallet.account;
                this.native.setRootRouter(this.nextScreen, navigationState);
            } else {
                this.native.setRootRouter('/wallet/intents/select-subwallet', {...navigationState, nextScreen: this.nextScreen});
            }
        }
        else {
            this.native.setRootRouter(this.nextScreen, navigationState);
        }
    }

    handleAddCoinIntent(intent: EssentialsIntentPlugin.ReceivedIntent) {
        let params: AddERCTokenRequestParams = intent.params;

        this.walletEditionService.reset();
        this.walletEditionService.intentTransfer = {
            action: this.getShortAction(intent.action),
            intentId: intent.intentId
        };

        this.native.setRootRouter("/wallet/coin-add-erc20", { ...params, forIntent: true });
    }

    handleAccessIntent(intent: EssentialsIntentPlugin.ReceivedIntent) {
        this.walletAccessService.reset();
        this.walletAccessService.intentTransfer = {
            action: this.getShortAction(intent.action),
            intentId: intent.intentId
        };
        this.walletAccessService.requestFields = intent.params.reqfields || intent.params;
        if (this.walletList.length === 1) {
            const masterWallet = this.walletList[0];
            this.walletAccessService.masterWalletId = masterWallet.id;
            this.native.setRootRouter('/wallet/intents/access', { rootPage: true});
        } else {
            this.native.setRootRouter(
                '/wallet/wallet-manager',
                {
                    forIntent: true,
                    intent: 'access',
                    intentParams: intent.params
                }
            );
        }
    }

    private async handleVoteAgainstProposalIntent(intent: EssentialsIntentPlugin.ReceivedIntent) {
        Logger.log("wallet", "Handling vote against proposal intent");

        // Let the screen know for which proposal we want to vote against
        this.coinTransferService.transfer.votes = [
            intent.params.proposalHash
        ];
    }

    /**
     * Intent that gets a CR proposal object as input and returns a HEX digest of it.
     * Usually used to create a digest representation of a proposal before signing it and/or
     * publishing it in a transaction.
     */
    private async handleCreateProposalDigestIntent(intent: EssentialsIntentPlugin.ReceivedIntent) {
        Logger.log("wallet", "Handling create proposal digest silent intent");

        if (intent && intent.params && intent.params.proposal) {
            let masterWalletID = await this.walletManager.getCurrentMasterIdFromStorage();
            let digest = await this.walletManager.spvBridge.proposalOwnerDigest(masterWalletID, StandardCoinName.ELA, intent.params.proposal);

            // This is a silent intent, app will close right after calling sendIntentresponse()
            await this.globalIntentService.sendIntentResponse({digest: digest}, intent.intentId);
        }
        else {
            // This is a silent intent, app will close right after calling sendIntentresponse()
            await this.globalIntentService.sendIntentResponse({message: "Missing proposal input parameter in the intent", status: 'error'}, intent.intentId);
        }
    }

    private getChainIDByCurrency(currency: string) {
        let chainID = StandardCoinName.ELA;
        switch (currency) {
            case 'ELA':
                chainID = StandardCoinName.ELA;
                break;
            case 'IDChain':
            case 'ELA/ID':
                chainID = StandardCoinName.IDChain;
                break;
            case 'ETHSC':
            case 'ELA/ETHSC':
                chainID = StandardCoinName.ETHSC;
                break;
            default:
                if (currency.startsWith('ELA/ETHSC:')) {
                    chainID = currency.substring(10) as StandardCoinName;
                    const coin = this.coinService.getCoinByID(chainID);
                    if (!coin) {
                        chainID = null;
                        Logger.log("wallet", 'Not support coin:', currency);
                    }
                } else {
                    chainID = null;
                    Logger.log("wallet", 'Not support coin:', currency);
                }
                break;
        }
        return chainID;
    }

    async scan(type: ScanType) {
      let res = await this.globalIntentService.sendIntent('https://scanner.elastos.net/scanqrcode', {});
      let content: string = res.result.scannedContent;

      // Some address star with "xxx:", eg "etherum:"
      const index = content.indexOf(':');
      if (index !== -1) {
          content = content.substring(index + 1);
      }
      Logger.log('Wallet', 'Got scan result:', content);

      switch (type) {
          case ScanType.Address:
              this.events.publish('address:update', content);
              break;
          case ScanType.Publickey:
              this.events.publish('publickey:update', content);
              break;
          case ScanType.PrivateKey:
              this.events.publish('privatekey:update', content);
              break;
      }
    }
}
