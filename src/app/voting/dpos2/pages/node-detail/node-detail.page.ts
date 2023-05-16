import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import BigNumber from 'bignumber.js';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { areaList } from 'src/app/model/area.list';
import { Util } from 'src/app/model/util';
import { GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { DPoS2RegistrationInfo, DPoS2Service } from '../../services/dpos2.service';

type DPoSTransactionInfo = {
    Status?: string;
    address?: string;
    time?: number;
    txid?: string;
    height?: number;
}

@Component({
    selector: 'app-node-detail',
    templateUrl: './node-detail.page.html',
    styleUrls: ['./node-detail.page.scss'],
})
export class NodeDetailPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public masterWalletId: string;
    public areaList = areaList;
    public dposInfo: DPoS2RegistrationInfo = {
        nickname: "",
        location: 0,
        stakeuntil: 0,
        url: '',
        state: "Unregistered",
    };
    public state = "";
    public elastosChainCode = StandardCoinName.ELA;

    public blockHeight = 0;
    public cancelHeight = 0;
    public available = 0;

    balance: BigNumber; // ELA

    transFunction: any;
    title = '';
    info = '';

    needConfirm = false;

    private TRANSACTION_LIMIT = 50;// for rpc
    public transactionInfo: DPoSTransactionInfo = {
        time: 0,
        txid: "",
        height: 0,
    }
    public publishedTime = "";
    public confirmCount = -1;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        public voteService: VoteService,
        public jsonRPCService: GlobalJsonRPCService,
        private globalNav: GlobalNavService,
        public dpos2Service: DPoS2Service,
        private globalNative: GlobalNativeService,
    ) {
    }

    ngOnInit() {
        Logger.log("DPosRegistrationPage", "ngOnInit")
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    async ionViewWillEnter() {

        this.titleBar.setTitle(this.translate.instant('dposvoting.dpos2-node-info'));

        Logger.log("DPosRegistrationPage", this.voteService.masterWalletId);
        this.masterWalletId = this.voteService.masterWalletId;
        // this.titleBar.setTheme('#732dcf', TitleBarForegroundMode.LIGHT);

        this.dposInfo = this.dpos2Service.dposInfo;
        if (this.dpos2Service.dposInfo.state == 'Pending') {
            await this.dpos2Service.fetchNodes();
            this.dposInfo = this.dpos2Service.dposInfo;
        }

        let depositAddress = await this.voteService.sourceSubwallet.getOwnerDepositAddress();
        const txRawList = await GlobalElastosAPIService.instance.getTransactionsByAddress(StandardCoinName.ELA, [depositAddress],
            this.TRANSACTION_LIMIT);
        if (txRawList && txRawList.length > 0) {
            this.transactionInfo = txRawList[0].result.txhistory[0] as DPoSTransactionInfo;
            // this.publishedTime = (new Date(this.transactionInfo.time * 1000)).toLocaleString();
            this.publishedTime = Util.timestampToDateTime(this.transactionInfo.time * 1000);
            Logger.log(App.DPOS2, "transactionInfo:", this.transactionInfo);
        }

        await this.addCandidateOperationIcon(this.theme.darkMode);

        switch (this.dposInfo.state) {

            // Pending indicates the producer is just registered and didn't get 6
            // confirmations yet.
            case 'Pending':
                this.confirmCount = await this.dpos2Service.getConfirmCount(this.transactionInfo.txid);
                break;

            // Active indicates the producer is registered and confirmed by more than
            // 6 blocks.
            case 'Active':
                break;

            // Inactive indicates the producer has been inactivated for a period which shall
            // be punished and will be activated later.
            case 'Inactive':
                // this.titleBar.setTitle(this.translate.instant('dposvoting.dpos-node-info'));
                break;

            // Canceled indicates the producer was canceled.
            case 'Canceled':
                break;

            // Illegal indicates the producer was found to break the consensus.
            case 'Illegal':
                this.titleBar.setTitle(this.translate.instant('dposvoting.illegal'));
                break;

            // Returned indicates the producer has canceled and deposit returned.
            case 'Returned':
                break;
        }
    }

    goToUpdate() {
        if (!this.dpos2Service.dposInfo.txConfirm) {
            this.globalNative.genericToast('dposvoting.text-update-no-confirm');
            return;
        }

        void this.globalNav.navigateTo(App.DPOS2, '/dposregistration/registration');
    }

    async addCandidateOperationIcon(darkMode: boolean) {
        let state = this.dpos2Service.dposInfo.state;
        var menuItems =  [] as TitleBarMenuItem[];

        if (state == 'Active' || state == 'Inactive') {
            menuItems.push({
                key: "edit-node",
                iconPath: !darkMode ? '/assets/voting/icons/edit.svg' : '/assets/voting/icons/darkmode/edit.svg',
                title: "dposvoting.edit-node"
            });
        }

        let identity = this.dpos2Service.dposInfo.identity;
        if ((identity == "DPoSV1V2" && (state == 'Active' || state == 'Inactive')) || state == 'Canceled') {
            this.available = await this.dpos2Service.getDepositcoin();
            if (this.available > 0) {
                menuItems.push({
                    key: "withdraw",
                    iconPath: !darkMode ? '/assets/voting/icons/withdraw.svg' : '/assets/voting/icons/darkmode/withdraw.svg',
                    title: "dposvoting.retrieve"
                });
            }
        }

        if (menuItems.length > 0) {
            this.titleBar.setMenuVisibility(true);
            this.titleBar.setupMenuItems(menuItems);
            this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = item => {
                switch (item.key) {
                    case "edit-node":
                        this.dpos2Service.onlyUpdateStakeUntil = false;
                        void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/dpos2/update');
                        break;

                    case "withdraw":
                        void this.dpos2Service.retrieve(this.available);
                        break;
                }
            });
        }
    }

}
