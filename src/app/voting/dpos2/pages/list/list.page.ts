import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { App } from 'src/app/model/app.enum';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DposStatus, VoteService } from 'src/app/voting/services/vote.service';
import { NodesSortType, OptionsComponent } from '../../components/options/options.component';
import { DPoS2Node } from '../../model/nodes.model';
import { DPoS2Service } from '../../services/dpos2.service';

@Component({
    selector: 'app-list',
    templateUrl: './list.page.html',
    styleUrls: ['./list.page.scss'],
})
export class ListPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    // Values
    public selectedNodes = 0;

    // Intent
    public voted = false;

    // DPoS2Node Detail
    public showNode = false;
    public nodeIndex: number;
    public node: DPoS2Node;
    public dposListSorted: DPoS2Node[] = [];

    public dataFetched = false;

    private registering = false;
    public available = 0;

    private popover: HTMLIonPopoverElement = null;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public dpos2Service: DPoS2Service,
        private translate: TranslateService,
        private globalNative: GlobalNativeService,
        private globalNav: GlobalNavService,
        public voteService: VoteService,
        public theme: GlobalThemeService,
        public popupProvider: GlobalPopupService,
        private popoverCtrl: PopoverController,
        private router: Router,
        public zone: NgZone,
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (navigation.extras.state && navigation.extras.state.refreash) {
            void this.initData();
        }

        GlobalFirebaseService.instance.logEvent("voting_dpos_vote_enter");
    }

    async ngOnInit() {

    }

    private async initData() {
        this.dataFetched = false;
        await this.dpos2Service.init();
        this.sortNodes(NodesSortType.VotesDec);
        await this.getSelectedNodes();

        if (!this.voteService.isMuiltWallet()) {
            if (this.dpos2Service.dposInfo.state == 'Unregistered'
                || (this.dpos2Service.dposInfo.state == 'Active' && this.dpos2Service.dposInfo.identity == "DPoSV1")) {
                if (this.dpos2Service.dposInfo.identity == 'DPoSV1') {
                    this.dpos2Service.dposInfo.state = 'Unregistered';
                }
                this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: 'register', iconPath: BuiltInIcon.ADD });
            }
            else if (this.dpos2Service.dposInfo.state != 'Returned' && this.dpos2Service.dposInfo.identity != "DPoSV1") {
                this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: 'detail', iconPath: this.theme.darkMode ? 'assets/dposvoting/icon/darkmode/node.svg' : 'assets/dposvoting/icon/node.svg' });
            }
            else if (this.dpos2Service.dposInfo.state == 'Canceled' && this.dpos2Service.dposInfo.identity == "DPoSV1") {
                let status = await this.voteService.dPoSStatus.value;
                if (status == DposStatus.DPoSV2) {
                    this.available = await this.dpos2Service.getDepositcoin();
                    if (this.available > 0) {
                        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: 'withdraw', iconPath: this.theme.darkMode ? '/assets/voting/icons/darkmode/withdraw.svg' : '/assets/voting/icons/withdraw.svg' });
                    }
                }
            }
        }

        this.titleBar.setIcon(TitleBarIconSlot.INNER_RIGHT, {
            key: "sort",
            iconPath: !this.theme.darkMode ? '/assets/launcher/icons/vertical-dots.svg' : '/assets/launcher/icons/dark_mode/vertical-dots.svg',
        });
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
            switch (icon.key) {
                case 'register':
                    void this.goToRegistration();
                    break;
                case 'detail':
                    void this.globalNav.navigateTo(App.DPOS2, '/dpos2/node-detail');
                    break;
                case 'withdraw':
                    void this.goToWithdraw();
                    break;
                case 'sort':
                    void this.showOptions(event);
                    break;
            }
        });

        this.dataFetched = true;
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('launcher.app-dpos2-voting'));

        void this.initData();
    }

    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }

    async goToRegistration() {
        if (!this.dpos2Service.dposInfo.txConfirm) {
            this.globalNative.genericToast('dposvoting.text-registration-no-confirm');
            return;
        }

        if (this.registering) return;
        this.registering = true;
        if (this.dpos2Service.dposInfo.identity == 'DPoSV1') {
            if (!await this.popupProvider.ionicConfirm('wallet.text-warning', 'dposvoting.dpos1-update-warning', 'common.ok', 'common.cancel')) {
                this.registering = false;
                return;
            }
        }
        else {
            if (!await this.dpos2Service.checkBalanceForRegDposNode()) {
                this.registering = false;
                return;
            }

            if (!await this.popupProvider.ionicConfirm('wallet.text-warning', 'dposvoting.dpos-deposit-warning', 'common.ok', 'common.cancel')) {
                this.registering = false;
                return;
            }
        }

        await this.globalNav.navigateTo(App.DPOS2, '/dpos2/registration');
        this.registering = false;
    }

    async goToWithdraw() {
        if (!await this.popupProvider.ionicConfirm('wallet.text-warning', 'dposvoting.dpos1-withdraw-warning', 'common.ok', 'common.cancel')) {
            return;
        }

        void this.dpos2Service.retrieve(this.available);
    }

    async showOptions(ev: any) {
        this.popover = await this.popoverCtrl.create({
          mode: 'ios',
          component: OptionsComponent,
          componentProps: {
          },
          cssClass: !this.theme.activeTheme.value.config.usesDarkMode ? 'launcher-options-component' : 'launcher-options-component-dark',
          event: ev,
          translucent: false
        });
        void this.popover.onWillDismiss().then((ret) => {
          this.sortNodes(ret?.data);
          this.popover = null;
        });
        return await this.popover.present();
    }

    sortNodes(type: NodesSortType) {
      switch (type) {
        case NodesSortType.VotesDec:
          this.dposListSorted = this.dpos2Service.dposList.sort((a, b) => {
            return a.dposv2votesNumber <= b.dposv2votesNumber ? 1 : -1;
          });
        break;
        case NodesSortType.VotesInc:
          this.dposListSorted = this.dpos2Service.dposList.sort((a, b) => {
            return a.dposv2votesNumber >= b.dposv2votesNumber ? 1 : -1;
          });
        break;
        case NodesSortType.CreationDateDec:
          this.dposListSorted = this.dpos2Service.dposList.sort((a, b) => {
            return a.registerheight >= b.registerheight ? 1 : -1;
          });
        break;
        case NodesSortType.CreationDateInc:
          this.dposListSorted = this.dpos2Service.dposList.sort((a, b) => {
            return a.registerheight <= b.registerheight ? 1 : -1;
          });
        break;
        case NodesSortType.NameInc:
          this.dposListSorted = this.dpos2Service.dposList.sort((a, b) => {
            return a.nickname.localeCompare(b.nickname);
          });
        break;
        case NodesSortType.NameDec:
          this.dposListSorted = this.dpos2Service.dposList.sort((a, b) => {
            return a.nickname.localeCompare(b.nickname) >= 0 ? -1 : 1;
          });
        break;
        case NodesSortType.StakeUntilInc:
          this.dposListSorted = this.dpos2Service.dposList.sort((a, b) => {
            return a.stakeuntil <= b.stakeuntil ? 1 : -1;
          });
        break;
        case NodesSortType.StakeUntilDec:
          this.dposListSorted = this.dpos2Service.dposList.sort((a, b) => {
            return a.stakeuntil >= b.stakeuntil ? 1 : -1;
          });
        break;
        default:
          return;
      }
    }

    async castVote() {
        let castedNodeKeys: string[] = [];
        this.dpos2Service.activeNodes.forEach(node => {
            if (node.isChecked === true) {
                castedNodeKeys = castedNodeKeys.concat(node.ownerpublickey);
            }
        });

        if (castedNodeKeys.length > 0) {
            await this.dpos2Service.setStoredVotes(castedNodeKeys);
            void this.globalNav.navigateTo(App.DPOS2, '/dpos2/vote');
        }
    }

    getSelectedNodes(): number {
        var selectedNodes = 0;
        this.dposListSorted.forEach(node => {
            if (node.isChecked === true) {
                selectedNodes++;
            }
        });
        this.selectedNodes = selectedNodes;
        return this.selectedNodes;
    }

    //// DPoS2Node Detail ////
    _showNode(index: number, node: DPoS2Node) {
        this.showNode = !this.showNode;
        this.nodeIndex = index;
        this.node = node;
    }

    return() {
        this.showNode = false;
    }

    clickCheckBox(node: any) {
        this.zone.run(() => {
            if (node.isChecked) {
                this.selectedNodes--;
            }
            else {
                this.selectedNodes++;
            }
        });
    }

    goTo(url: string) {
        void this.globalNav.navigateTo(App.DPOS2, url);
    }

    goToUpdateNode() {
        this.dpos2Service.onlyUpdateStakeUntil = true;
        void this.globalNav.navigateTo(App.DPOS2, '/dpos2/update');
    }

    async doRefresh(event) {
        this.voteService.needFetchData[App.DPOS2] = true;
        await this.dpos2Service.init();
        this.sortNodes(NodesSortType.VotesDec);
        await this.getSelectedNodes();

        setTimeout(() => {
            event.target.complete();
        }, 500);
    }
}


