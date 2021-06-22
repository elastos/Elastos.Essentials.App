import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { areaList } from 'src/app/model/area.list';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { StandardCoinName } from 'src/app/wallet/model/Coin';
import { VoteService } from 'src/app/vote/services/vote.service';
import { WalletManager } from 'src/app/wallet/services/wallet.service';
import { AuthService } from 'src/app/wallet/services/auth.service';
import BigNumber from 'bignumber.js';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';


type CRRegistrationInfo = {
    BondedDID?: boolean;
    CID?: string;
    CROwnerPublicKey?: string;
    Confirms?: number;
    DID?: string;
    Location: number;
    NickName: string;
    URL: string;
}

@Component({
    selector: 'app-registration',
    templateUrl: './registration.page.html',
    styleUrls: ['./registration.page.scss'],
})
export class CRCouncilRegistrationPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public masterWalletId: string;
    public areaList = areaList;
    public crInfo: CRRegistrationInfo = {
        NickName: "test",
        Location: 86,
        URL:'http://test.com',
    };
    public status:string = "";
    public chainId = StandardCoinName.ELA;
    public did: string;

    balance: BigNumber; // ELA

    private depositAmount = 500000000000; // 5000 ELA

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        private walletManager: WalletManager,
        public voteService: VoteService,
        private authService: AuthService,
        public popupProvider: PopupProvider,
    ) {

    }

    ngOnInit() {
        Logger.log("CRCouncilRegistrationPage", "ngOnInit")
    }

    async ionViewWillEnter() {
        Logger.log("CRCouncilRegistrationPage", this.voteService.masterWalletId);
        this.did = GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", "");
        this.masterWalletId = this.voteService.masterWalletId;
        // let ret = await this.walletManager.spvBridge.getRegisteredCRInfo(this.voteService.masterWalletId, StandardCoinName.ELA);

        // let info = JSON.parse(ret);
        // this.status = info.Status;
        // Logger.log("crcouncilregistration", info);
        // switch (info.Status) {
        //     case 'Unregistered':
        //         this.titleBar.setTitle(this.translate.instant('crcouncilmanager.registration'));
        //         let ownerPublickey = await this.walletManager.spvBridge.getOwnerPublicKey(this.masterWalletId, StandardCoinName.ELA);
        //         this.crInfo.DID = GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", "");
        //         this.crInfo.CROwnerPublicKey = ownerPublickey;
        //         break;
        //     case 'Registered':
        //         this.titleBar.setTitle(this.translate.instant('crcouncilmanager.member-info'));
        //         this.crInfo = info.Info;
        //         break;
        //     case 'Canceled':
        //         this.titleBar.setTitle(this.translate.instant('crcouncilmanager.retrieve'));
        //         this.crInfo = info.Info;
        //         break;
        // }
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);

    }

    // notifyNoIDChain() {
    //     return this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.no-open-side-chain');
    // }

    async register() {
        Logger.log('crcouncilregistration', 'Calling register()', this.crInfo);

        this.balance = this.voteService.masterWallet.getSubWalletBalance(this.chainId);

        //Check value
        if (this.balance.lt(0.0002)) {
            this.popupProvider.ionicAlert('wallet.confirmTitle', 'wallet.text-did-balance-not-enough');
            return;
        }

        const payPassword = await this.authService.getWalletPassword(this.masterWalletId);
        if (payPassword === null) {// cancelled by user
            return;
        }

    // payload.Signature = await this.walletManager.spvBridge.didSignDigest(this.masterWallet.id,
    //         this.transfer.did, digest, payPassword);

        const payload = await this.walletManager.spvBridge.generateCRInfoPayload(this.masterWalletId, StandardCoinName.ELA,
            this.crInfo.CROwnerPublicKey, this.crInfo.DID, this.crInfo.NickName, this.crInfo.URL, this.crInfo.Location);

        const rawTx = await this.voteService.sourceSubwallet.createRegisterCRTransaction(payload, this.depositAmount, "");

        await this.voteService.signAndSendRawTransaction(rawTx);
    }

    async unregister() {
        Logger.log('crcouncilregistration', 'Calling createUnregisterCRCouncilTransaction()');


        const payload = await this.walletManager.spvBridge.generateUnregisterCRPayload(this.masterWalletId, StandardCoinName.ELA,
            this.crInfo.DID);

        const rawTx = await this.voteService.sourceSubwallet.createUnregisterCRTransaction(payload, "");

        await this.voteService.signAndSendRawTransaction(rawTx);
    }

    async update() {
        Logger.log('crcouncilregistration', 'Calling update()', this.crInfo);

        const payPassword = await this.authService.getWalletPassword(this.masterWalletId);
        if (payPassword === null) {// cancelled by user
            return;
        }

        const payload = await this.walletManager.spvBridge.generateCRInfoPayload(this.masterWalletId, StandardCoinName.ELA,
            this.crInfo.CROwnerPublicKey, this.crInfo.DID, this.crInfo.NickName, this.crInfo.URL, this.crInfo.Location);

        const rawTx = await this.voteService.sourceSubwallet.createUpdateCRTransaction(payload, "");
        await this.voteService.signAndSendRawTransaction(rawTx);
    }

    async retrieve() {
        Logger.log('crcouncilregistration', 'Calling retrieve()', this.crInfo);

        const crPublickeys = await this.walletManager.spvBridge.getAllPublicKeys(this.masterWalletId, StandardCoinName.IDChain, 0, 1);
        const crPublicKey = crPublickeys.PublicKeys[0];

        // let depositAddress = await this.walletManager.spvBridge.getDepositAddress(this.ownerPublicKey);
        //Utxo

        const rawTx = await this.voteService.sourceSubwallet.createRetrieveCRDepositTransaction("");

        await this.voteService.signAndSendRawTransaction(rawTx);
    }

}
