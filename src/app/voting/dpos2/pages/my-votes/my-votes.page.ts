import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CreateNFTInfo } from '@elastosfoundation/wallet-js-sdk';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { SHA256 } from 'src/app/helpers/crypto/sha256';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { Util } from 'src/app/model/util';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { UXService } from 'src/app/voting/services/ux.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { Config } from 'src/app/wallet/config/Config';
import { AuthService } from 'src/app/wallet/services/auth.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
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

    constructor(
        public dpos2Service: DPoS2Service,
        public voteService: VoteService,
        public theme: GlobalThemeService,
        public translate: TranslateService,
        public popupProvider: GlobalPopupService,
        public uxService: UXService,
        private storage: GlobalStorageService
    ) { }

    async ngOnInit() {
    }

    ngOnDestroy() {
    }

    async initData() {
        this.dataFetched = false;
        await this.dpos2Service.init();
        this.votes = await this.dpos2Service.geMyVoteds();
        this.dataFetched = true;
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('dposvoting.my-votes'));
        void this.initData();
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
            this.signingAndTransacting = true;
            await GlobalNativeService.instance.showLoading(this.translate.instant('common.please-wait'));

            if (!await this.voteService.checkWalletAvailableForVote()) {
                return;
            }

            const payload: CreateNFTInfo = {
                ReferKey: node.referkey,
                StakeAddress: this.voteService.sourceSubwallet.getOwnerStakeAddress(),
                GenesisBlockHash: Config.ETHSC_GENESISBLOCKHASH,
            };

            Logger.log(App.DPOS2, "mintBPosNFT payload:", payload);

            const rawTx = await this.voteService.sourceSubwallet.createMintNFTTransaction(payload);

            await GlobalNativeService.instance.hideLoading();
            Logger.log(App.DPOS2, "rawTx:", rawTx);

            let ret = await this.voteService.signAndSendRawTransaction(rawTx, App.DPOS2, "/dpos2/menu/my-votes");
            Logger.log(App.DPOS2, "signAndSendRawTransaction:", ret);
            if (ret) {
                this.voteService.toastSuccessfully('dposvoting.update-vote');

                let escNetworks = WalletNetworkService.instance.getNetworkByKey('elastossmartchain');
                if (escNetworks) {
                    let escNetworkWallet = await escNetworks.createNetworkWallet(this.voteService.networkWallet.masterWallet, false);
                    let address = escNetworkWallet.getMainEvmSubWallet().getCurrentReceiverAddress();
                    await this.createNFTSignature(ret.txid, address);
                }
            }
        }
        catch (e) {
            await this.voteService.popupErrorMessage(e);
        }
        finally {
            await GlobalNativeService.instance.hideLoading();
            this.signingAndTransacting = false;
        }

        // Update votes or hide the vote that minted.
    }

    onClick(index: number) {
        this.showNode = false;
    }

    async createNFTSignature(txid: string, receiver: string) {
        let txidEx = txid.startsWith('0x') ? txid.substring(2) : txid;
        let addressEx = receiver.startsWith('0x') ? receiver.substring(2) : receiver;

        let data = Util.reverseHexToBE(txidEx) + addressEx;
        let digest = SHA256.encodeToBuffer(Buffer.from(data)).toString('hex');

        const password = await AuthService.instance.getWalletPassword(this.voteService.masterWalletId);
        if (password === null) {// cancelled by user
            return;
        }

        let signature = await this.voteService.sourceSubwallet.signDigestWithOwnerKey(digest, password);
        let publicKey = this.voteService.sourceSubwallet.getOwnerPublicKey();

        // save
        await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "bposvoting", "bposnft-" + txid, {signature, publicKey});
    }
}
