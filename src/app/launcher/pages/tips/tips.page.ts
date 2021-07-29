import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';
import { DomSanitizer } from '@angular/platform-browser';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TranslateService } from '@ngx-translate/core';
import { Tip } from '../../model/tip.model';
import { TipAudience } from '../../model/tipaudience.model';
import { TipsService } from '../../services/tips.service';
import { Logger } from 'src/app/logger';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem, TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';

@Component({
  selector: 'app-tips',
  templateUrl: './tips.page.html',
  styleUrls: ['./tips.page.scss'],
})
export class TipsPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public tipToShow: Tip;
  public currentlyShownTip: Tip;
  private allDisplayableTips: Tip[];

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    private navParams: NavParams,
    public theme: GlobalThemeService,
    private modalController: ModalController,
    private translate: TranslateService,
    private tipsService: TipsService
  ) { }

  async ngOnInit() {
    this.allDisplayableTips = await this.tipsService.getAllTipsUserCanView();
    this.tipToShow = this.navParams.get('tipToShow');
    this.currentlyShownTip = this.tipToShow;
    Logger.log('Launcher', 'Tip to show:', this.tipToShow);

    // Mark tip as shown to not notify it any more
    await this.tipsService.markTipAsViewed(this.currentlyShownTip);
  }

  ionViewWillEnter() {
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, {
      key: "close",
      iconPath: BuiltInIcon.CLOSE
    });
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      if (icon.key === "close") {
        this.closePage();
      }
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  public getTipTitle(tip: Tip) {
    return this.translate.instant(tip.title);
  }

  public getTipMessage(tip: Tip) {
    return this.translate.instant(tip.message);
  }

  public getTipAudience(tip: Tip) {
    if (tip.audience == TipAudience.FOR_ELASTOS_TRINITY_GENERIC)
      return this.translate.instant("launcher.tip-audience-generic");
    else if (tip.audience == TipAudience.FOR_ELASTOS_TRINITY_DEVELOPERS)
      return this.translate.instant("launcher.tip-audience-developers");
  }

  public async showPreviousTip() {
    let currentTipIndex = this.allDisplayableTips.findIndex(tip => tip == this.currentlyShownTip);
    let previousTipIndex = (currentTipIndex>0 ? currentTipIndex-1 : this.allDisplayableTips.length-1);
    this.currentlyShownTip = this.allDisplayableTips[previousTipIndex];

    // Mark tip as shown to not notify it any more
    await this.tipsService.markTipAsViewed(this.currentlyShownTip);
  }

  public async showNextTip() {
    let currentTipIndex = this.allDisplayableTips.findIndex(tip => tip == this.currentlyShownTip);
    let nextTipIndex = (currentTipIndex+1)%this.allDisplayableTips.length;
    this.currentlyShownTip = this.allDisplayableTips[nextTipIndex];

    // Mark tip as shown to not notify it any more
    await this.tipsService.markTipAsViewed(this.currentlyShownTip);
  }

  public closePage() {
    void this.modalController.dismiss();
  }
}
