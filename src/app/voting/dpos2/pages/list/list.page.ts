import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DposStatus, VoteService } from 'src/app/voting/services/vote.service';
import { NodesActionType, NodesSortType, OptionsComponent } from '../../components/options/options.component';
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

    // action menu
    public actionOptions = [];

    public dataFetched = false;

    private isExecuting = false;
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

        this.prepareActionMenu();

        if (!this.voteService.isMuiltWallet()) {
            this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
                key: "action",
                iconPath:  !this.theme.darkMode ? '/assets/launcher/icons/vertical-dots.svg' : '/assets/launcher/icons/dark_mode/vertical-dots.svg',
            });
        }
        this.titleBar.setIcon(TitleBarIconSlot.INNER_RIGHT, {
            key: "sort",
            iconPath: !this.theme.darkMode ? '/assets/voting/icons/filter.svg' : '/assets/voting/icons/darkmode/filter.svg',
        });
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
            if (this.isExecuting) return;

            switch (icon.key) {
                case 'action':
                    void this.showActionOptions(event);
                    break
                case 'sort':
                    void this.showSortOptions(event);
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

    async prepareActionMenu() {
      this.actionOptions = [];

      if (!this.voteService.isMuiltWallet()) {
          if (this.dpos2Service.dposInfo.state == 'Unregistered'
              || (this.dpos2Service.dposInfo.state == 'Active' && this.dpos2Service.dposInfo.identity == "DPoSV1")) {
              if (this.dpos2Service.dposInfo.identity == 'DPoSV1') {
                  this.dpos2Service.dposInfo.state = 'Unregistered';
              }
              // this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: 'register', iconPath: BuiltInIcon.ADD });
              this.actionOptions.push({
                  type: NodesActionType.Register,
                  title: this.translate.instant("dposvoting.register-header"),
            });
          }
          else if (this.dpos2Service.dposInfo.state != 'Returned' && this.dpos2Service.dposInfo.identity != "DPoSV1") {
              // this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: 'detail', iconPath: this.theme.darkMode ? 'assets/dposvoting/icon/darkmode/node.svg' : 'assets/dposvoting/icon/node.svg' });
              this.actionOptions.push({
                  type: NodesActionType.Detail,
                  title: this.translate.instant("dposvoting.dpos2-node-info"),
            });
          }
          else if (this.dpos2Service.dposInfo.state == 'Canceled' && this.dpos2Service.dposInfo.identity == "DPoSV1") {
              let status = await this.voteService.dPoSStatus.value;
              if (status == DposStatus.DPoSV2) {
                  this.available = await this.dpos2Service.getDepositcoin();
                  if (this.available > 0) {
                      // this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: 'withdraw', iconPath: this.theme.darkMode ? '/assets/voting/icons/darkmode/withdraw.svg' : '/assets/voting/icons/withdraw.svg' });
                      this.actionOptions.push({
                        type: NodesActionType.Withdraw,
                        title: this.translate.instant("dposvoting.withdraw"),
                    });
                  }
              }
          }

          this.actionOptions.push({
              type: NodesActionType.CheckDPoSStatus,
              title: this.translate.instant("dposvoting.check-dpos-status"),
          });
      }
    }

    async showActionOptions(ev: any) {
        this.isExecuting = true;

        this.popover = await this.popoverCtrl.create({
            mode: 'ios',
            component: OptionsComponent,
            componentProps: {
                options: this.actionOptions,
            },
            cssClass: !this.theme.activeTheme.value.config.usesDarkMode ? 'launcher-options-component' : 'launcher-options-component-dark',
            event: ev,
            translucent: false
        });
        void this.popover.onWillDismiss().then((ret) => {
            this.isExecuting = false;
            this.doAction(ret?.data);
            this.popover = null;
        });
        return await this.popover.present();
    }

    doAction(type: NodesActionType) {
        switch (type) {
            case NodesActionType.Register:
                void this.goToRegistration();
            break;
            case NodesActionType.Detail:
                void this.globalNav.navigateTo(App.DPOS2, '/dpos2/node-detail');
            break;
            case NodesActionType.Withdraw:
                void this.goToWithdraw();
            break;
            case NodesActionType.CheckDPoSStatus:
                void this.checkDPoSStatus();
            break;
        }
    }

    async goToRegistration() {
        if (!this.dpos2Service.dposInfo.txConfirm && this.dpos2Service.dposInfo.identity !== 'DPoSV1') {
            this.globalNative.genericToast('dposvoting.text-registration-no-confirm');
            return;
        }

        this.isExecuting = true;
        try {
            await this.globalNative.showLoading(this.translate.instant('common.please-wait'));

            let dposInfo = await this.dpos2Service.checkDPoSStatus();
            Logger.log(App.DPOS2, ' dposInfo:', dposInfo);
            if (dposInfo) {
                this.globalNative.genericToast('dposvoting.already-registered-node', 4000);
                return;
            }

            if (this.dpos2Service.dposInfo.identity == 'DPoSV1') {
                if (!await this.popupProvider.ionicConfirm('wallet.text-warning', 'dposvoting.dpos1-update-warning', 'common.ok', 'common.cancel')) {
                    return;
                }
            }
            else {
                if (!await this.dpos2Service.checkBalanceForRegDposNode()) {
                    return;
                }

                if (!await this.popupProvider.ionicConfirm('wallet.text-warning', 'dposvoting.dpos-deposit-warning', 'common.ok', 'common.cancel')) {
                    return;
                }
            }

            await this.globalNav.navigateTo(App.DPOS2, '/dpos2/registration');
        }
        catch {
        }
        finally {
            await this.globalNative.hideLoading();
            this.isExecuting = false;
        }
    }

    async goToWithdraw() {
        if (!await this.popupProvider.ionicConfirm('wallet.text-warning', 'dposvoting.dpos1-withdraw-warning', 'common.ok', 'common.cancel')) {
            return;
        }

        this.isExecuting = true;
        try {
            await this.dpos2Service.retrieve(this.available);
        }
        catch (e) {
            Logger.warn(App.DPOS2, 'BPoS retrieve exception:', e)
        }
        finally {
            this.isExecuting = false;
        }
    }

    async checkDPoSStatus() {
        try {
            await this.globalNative.showLoading(this.translate.instant('common.please-wait'));
            let dposInfo = await this.dpos2Service.checkDPoSStatus();
            Logger.log(App.DPOS2, ' dposInfo:', dposInfo);
            if (dposInfo) {
                // Can't register BPoS node again. remove 'Register' from menu.
                this.prepareActionMenu();

                if ((dposInfo.state == 'Canceled') && (dposInfo.identity == "DPoSV1")) {
                    this.available = await this.dpos2Service.getDepositcoin();
                    await this.globalNative.hideLoading();
                    if (this.available > 0) {
                        return this.goToWithdraw();
                    }
                }
            }

            await this.globalNative.hideLoading();
            this.globalNative.genericToast('dposvoting.no-registered-dpos-node');
        }
        catch (e) {
            Logger.warn(App.DPOS2, 'checkDPoSStatus exception:', e)
        }
        finally {
            await this.globalNative.hideLoading();
        }
    }

    async showSortOptions(ev: any) {
        let options = [
            {
                type: NodesSortType.VotesDec,
                title: this.translate.instant("dposvoting.sort-votes-dec"),
            },
            {
                type: NodesSortType.VotesInc,
                title: this.translate.instant("dposvoting.sort-votes-inc"),
            },
            {
                type: NodesSortType.CreationDateDec,
                title: this.translate.instant("dposvoting.sort-creation-date-dec"),
            },
            {
                type: NodesSortType.CreationDateInc,
                title: this.translate.instant("dposvoting.sort-creation-date-inc"),
            },
            {
                type: NodesSortType.NameDec,
                title: this.translate.instant("dposvoting.sort-name-dec"),
            },
            {
                type: NodesSortType.NameInc,
                title: this.translate.instant("dposvoting.sort-name-inc"),
            },
            {
                type: NodesSortType.StakeUntilDec,
                title: this.translate.instant("dposvoting.sort-stake-until-dec"),
            },
            {
                type: NodesSortType.StakeUntilInc,
                title: this.translate.instant("dposvoting.sort-stake-until-inc"),
            },
        ];

        this.isExecuting = true;
        this.popover = await this.popoverCtrl.create({
          mode: 'ios',
          component: OptionsComponent,
          componentProps: {
            options
          },
          cssClass: !this.theme.activeTheme.value.config.usesDarkMode ? 'launcher-options-component' : 'launcher-options-component-dark',
          event: ev,
          translucent: false
        });
        void this.popover.onWillDismiss().then((ret) => {
          this.isExecuting = false;
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
            return a.registerheight <= b.registerheight ? 1 : -1;
          });
        break;
        case NodesSortType.CreationDateInc:
          this.dposListSorted = this.dpos2Service.dposList.sort((a, b) => {
            return a.registerheight >= b.registerheight ? 1 : -1;
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
            return a.stakeuntil >= b.stakeuntil ? 1 : -1;
          });
        break;
        case NodesSortType.StakeUntilDec:
          this.dposListSorted = this.dpos2Service.dposList.sort((a, b) => {
            return a.stakeuntil <= b.stakeuntil ? 1 : -1;
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

    showIntegerPart(value: number) {
        return Math.ceil(value);
    }

    hasMessage() {
        return this.dpos2Service.nodePublicKeyNotSet || this.dpos2Service.myNodeStakeExpired30
                || this.dpos2Service.myNodeStakeAboutExpire || this.dpos2Service.voteStakeExpired30
                || this.dpos2Service.voteStakeAboutExpire;
    }
}


