import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { Events } from 'src/app/services/events.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { AddERCTokenRequestParams } from '../model/adderctokenrequest';
import { StandardCoinName } from '../model/coin';
import { MasterWallet } from '../model/wallets/masterwallet';
import { EditCustomNetworkRoutingParams } from '../pages/settings/edit-custom-network/edit-custom-network.page';
import { CoinTransferService, TransferType } from './cointransfer.service';
import { Native } from './native.service';
import { WalletNetworkService } from './network.service';
import { PopupProvider } from './popup.service';
import { WalletService } from './wallet.service';
import { WalletAccessService } from './walletaccess.service';
import { WalletEditionService } from './walletedition.service';

export enum ScanType {
    Address = 1,
    Publickey = 2,
    PrivateKey = 3,
}


@Injectable({
    providedIn: 'root'
})
export class IntentService {
    private activeWallet: MasterWallet = null;
    private subscription: Subscription = null;
    private nextScreen = '';

    constructor(
        public events: Events,
        public native: Native,
        private walletManager: WalletService,
        private coinTransferService: CoinTransferService,
        private popupProvider: PopupProvider,
        private walletAccessService: WalletAccessService,
        private walletEditionService: WalletEditionService,
        private walletNetworkService: WalletNetworkService,
        private globalIntentService: GlobalIntentService,
    ) {
    }

    public init() {
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

            void this.onReceiveIntent(receivedIntent);
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

        this.activeWallet = this.walletManager.getActiveMasterWallet();
        if (!this.activeWallet) {
            this.native.setRootRouter('/wallet/launcher');
            const toCreateWallet = await this.popupProvider.ionicConfirm('wallet.intent-no-wallet-title', 'wallet.intent-no-wallet-msg', 'common.ok', 'wallet.exit');
            if (toCreateWallet) {
                // TODO
                // Should call sendIntentResponse?
            } else {
                // sendIntentResponse will exit current context, so must call setRootRouter('/wallet/launcher') first.
                await this.globalIntentService.sendIntentResponse({ message: 'No active master wallet!', status: 'error' }, intent.intentId);
            }
            return false;
        }

        switch (this.getShortAction(intent.action)) {
            case 'adderctoken':
                this.handleAddCoinIntent(intent);
                break;
            case 'addethereumchain':
                this.handleAddEthereumChainIntent(intent);
                break;
            case 'elawalletmnemonicaccess':
            case 'walletaccess':
                // TODO @chad titleBarManager.setNavigationMode(TitleBarPlugin.TitleBarNavigationMode.CLOSE);
                this.handleAccessIntent(intent);
                break;
            default:
                // TODO @chad titleBarManager.setNavigationMode(TitleBarPlugin.TitleBarNavigationMode.CLOSE);
                void this.handleTransactionIntent(intent);
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
    private getNumberFromParam(param): number {
        if (typeof param === 'string') {
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
            this.coinTransferService.elastosChainCode = StandardCoinName.ELA;
            this.coinTransferService.intentTransfer = {
                action: this.getShortAction(intent.action),
                intentId: intent.intentId
            };
        }

        // let intentRequiresWalletSelection = true; // User must select a walelt first before doing the real action
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
                this.coinTransferService.elastosChainCode = StandardCoinName.IDChain;
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
                this.coinTransferService.elastosChainCode = StandardCoinName.ETHDID;
                this.coinTransferService.didrequest = intent.params.didrequest;
                break;

            case 'esctransaction':
                this.nextScreen = '/wallet/intents/esctransaction';
                this.coinTransferService.payloadParam = intent.params.payload.params[0];
                // this.coinTransferService.amount = intent.params.amount;

                break;

            case 'pay':
                this.nextScreen = '/wallet/coin-transfer';
                const intentelastosChainCode = this.getElastosChainCodeByCurrency(intent.params.currency || 'ELA');
                if (intentelastosChainCode) {
                    this.coinTransferService.elastosChainCode = intentelastosChainCode;
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
                await this.handleCreateProposalDigestIntent(intent);
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

        // if (intentRequiresWalletSelection) {
        this.coinTransferService.masterWalletId = this.activeWallet.id;
        this.coinTransferService.walletInfo = this.activeWallet.account;
        this.native.setRootRouter(this.nextScreen, navigationState);
        // }
        // else {
        //     this.native.setRootRouter(this.nextScreen, navigationState);
        // }
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

    handleAddEthereumChainIntent(intent: EssentialsIntentPlugin.ReceivedIntent) {
        let params: EditCustomNetworkRoutingParams = {
            forEdition: false,
            intentMode: true,
            intentId: intent.intentId,
            preFilledRequest: intent.params
        }
        this.native.setRootRouter("/wallet/settings/edit-custom-network", params);
    }

    handleAccessIntent(intent: EssentialsIntentPlugin.ReceivedIntent) {
        this.walletAccessService.reset();
        this.walletAccessService.intentTransfer = {
            action: this.getShortAction(intent.action),
            intentId: intent.intentId
        };
        this.walletAccessService.requestFields = intent.params.reqfields || intent.params;
        // if (this.walletList.length === 1) {
        this.walletAccessService.masterWalletId = this.activeWallet.id;
        this.native.setRootRouter('/wallet/intents/access', { rootPage: true });
        // } else {
        //     this.native.setRootRouter(
        //         '/wallet/wallet-manager',
        //         {
        //             forIntent: true,
        //             intent: 'access',
        //             intentParams: intent.params
        //         }
        //     );
        // }
    }

    private handleVoteAgainstProposalIntent(intent: EssentialsIntentPlugin.ReceivedIntent) {
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
            await this.globalIntentService.sendIntentResponse({ digest: digest }, intent.intentId);
        }
        else {
            // This is a silent intent, app will close right after calling sendIntentresponse()
            await this.globalIntentService.sendIntentResponse({ message: "Missing proposal input parameter in the intent", status: 'error' }, intent.intentId);
        }
    }

    private getElastosChainCodeByCurrency(currency: string) {
        let elastosChainCode = StandardCoinName.ELA;
        switch (currency) {
            case 'ELA':
                elastosChainCode = StandardCoinName.ELA;
                break;
            case 'IDChain':
            case 'ELA/ID':
                elastosChainCode = StandardCoinName.IDChain;
                break;
            case 'ETHSC':
            case 'ELA/ETHSC':
                elastosChainCode = StandardCoinName.ETHSC;
                break;
            case 'ETHDID':
            case 'ELA/ETHDID':
                elastosChainCode = StandardCoinName.ETHDID;
                break;
            default:
                if (currency.startsWith('ELA/ETHSC:')) {
                    let elastosNetwork = this.walletNetworkService.getNetworkByKey("elastos");
                    elastosChainCode = currency.substring(10) as StandardCoinName;
                    const coin = elastosNetwork.getCoinByID(elastosChainCode);
                    if (!coin) {
                        elastosChainCode = null;
                        Logger.log("wallet", 'Not support coin:', currency);
                    }
                } else {
                    elastosChainCode = null;
                    Logger.log("wallet", 'Not support coin:', currency);
                }
                break;
        }
        return elastosChainCode;
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
