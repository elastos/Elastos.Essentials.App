import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CreateNFTInfo } from '@elastosfoundation/wallet-js-sdk';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { UXService } from 'src/app/voting/services/ux.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
import { MintBPoSNFTTxStatus } from 'src/app/wallet/model/elastos.types';
import { WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { MyVotesActionType, OptionsComponent } from '../../components/options/options.component';
import { DPoS2Service } from '../../services/dpos2.service';

@Component({
    selector: 'app-my-votes',
    templateUrl: './my-votes.page.html',
    styleUrls: ['./my-votes.page.scss'],
})
export class MyVotesPage implements OnInit, OnDestroy {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    private votes = [];
    // DPoS2Node Detail
    public showNode = false;
    public nodeIndex: number;
    public node: any;

    public dataFetched = false;
    public signingAndTransacting = false;

    public canMintBPoSNFT = true;

    constructor(
        public dpos2Service: DPoS2Service,
        public voteService: VoteService,
        public theme: GlobalThemeService,
        public translate: TranslateService,
        public popupProvider: GlobalPopupService,
        public uxService: UXService,
        private popoverCtrl: PopoverController,
    ) { }

    async ngOnInit() {
    }

    ngOnDestroy() {
    }

    async initData() {
        if (WalletType.STANDARD !== this.voteService.sourceSubwallet.masterWallet.type) {
            this.canMintBPoSNFT = false;
        }

        this.dataFetched = false;
        await this.dpos2Service.init();
        this.votes = await this.dpos2Service.geMyVoteds();
        this.dataFetched = true;
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('dposvoting.my-votes'));
        void this.initData();
    }

    async showOptions(ev: any, index: number, node: any) {
        let actionOptions = [{
          type: MyVotesActionType.Update,
          title: this.translate.instant("common.update"),
        }, {
          type: MyVotesActionType.MintNFT,
          title: this.translate.instant("dposvoting.dpos2-mint-bpos-nft"),
        }]
        let popover = await this.popoverCtrl.create({
            mode: 'ios',
            component: OptionsComponent,
            componentProps: {
              options: actionOptions,
            },
            cssClass: !this.theme.activeTheme.value.config.usesDarkMode ? 'options-component' : 'options-component-dark',
            event: ev,
            translucent: false
        });
        popover.onWillDismiss().then((ret) => {
            void this.doActionAccordingToOptions(ret.data, index, node);
        });
        return await popover.present();
    }

    doActionAccordingToOptions(type: MyVotesActionType, index: number, node: any) {
      switch (type) {
          case MyVotesActionType.Update:
              void this.showUpdateNode(index, node);
          break;
          case MyVotesActionType.MintNFT:
              void this.mintBPosNFT(index, node);
          break;
      }
    }

    showUpdateNode(index: number, node: any) {
        if ((node.locktime - node.blockheight) >= 720000) {
            return GlobalNativeService.instance.genericToast('voting.vote-max-deadline');
        }

        this.showNode = true;
        this.nodeIndex = index;
        this.node = node;
    }

    async mintBPosNFT(index: number, node: any) {
        try {
            if (node.nodeState != 'Active') {
                let confirmed = await this.popupProvider.showConfirmationPopup(
                    this.translate.instant('dposvoting.confirm-mintnft-title'),
                    this.translate.instant('dposvoting.confirm-mintnft-prompt'),
                    this.translate.instant('common.continue'),
                    "/assets/identity/default/publishWarning.svg");
                if (!confirmed) {
                    return;
                }
            }

            this.signingAndTransacting = true;
            await GlobalNativeService.instance.showLoading(this.translate.instant('common.please-wait'));

            if (!await this.voteService.checkWalletAvailableForVote()) {
                return;
            }

            const payload: CreateNFTInfo = {
                ReferKey: node.referkey,
                StakeAddress: this.voteService.sourceSubwallet.getOwnerStakeAddress(),
                GenesisBlockHash: Config.ETHSC_GENESISBLOCKHASH,
                StartHeight: node.blockheight,
                EndHeight: node.locktime,
                Votes: Util.toSELA(node.votes),
                VoteRights: Util.toSELA(node.voteRights),
                TargetOwnerKey: node.candidate
            };

            Logger.log(App.DPOS2, "mintBPosNFT payload:", payload);

            const rawTx = await this.voteService.sourceSubwallet.createMintNFTTransaction(payload);

            await GlobalNativeService.instance.hideLoading();
            Logger.log(App.DPOS2, "rawTx:", rawTx);

            let result = await this.voteService.signAndSendRawTransaction(rawTx, App.DPOS2, "/dpos2/menu/my-votes");
            if (result && result.published) {
                this.voteService.sourceSubwallet.saveMintNFTTxToCache({txid: result.txid, status: MintBPoSNFTTxStatus.Unconfirmed})
            }
        }
        catch (e) {
            await this.voteService.popupErrorMessage(e);
        }
        finally {
            await GlobalNativeService.instance.hideLoading();
            this.signingAndTransacting = false;
        }

        // TODO: Update votes or hide the vote that minted.
    }

    onClick(index: number) {
        this.showNode = false;
    }
}
