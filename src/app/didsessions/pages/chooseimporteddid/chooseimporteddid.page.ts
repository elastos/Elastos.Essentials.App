import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { UXService } from '../../services/ux.service';
import { Util } from '../../services/util';
import { IdentityService } from '../../services/identity.service';
import { DID } from '../../model/did.model';
import { Router } from '@angular/router';
import { GlobalLanguageService } from 'src/app/services/global.language.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode, TitleBarIconSlot, BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';

@Component({
  selector: 'app-chooseimporteddid',
  templateUrl: './chooseimporteddid.page.html',
  styleUrls: ['./chooseimporteddid.page.scss'],
})
export class ChooseImportedDIDPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
  public importedDids: DID[] = [];
  public selectedDid: DID = null;
  private nextStepId: number = null;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public languageService: GlobalLanguageService,
    public router: Router,
    public theme: GlobalThemeService,
    private uxService: UXService,
    private identityService: IdentityService,
    private translate: TranslateService
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (!Util.isEmptyObject(navigation.extras.state)) {
      this.nextStepId = navigation.extras.state.enterEvent.stepId;
      Logger.log('didsessions', 'Chooseimporteddid - nextStepId', this.nextStepId);
      this.importedDids = navigation.extras.state.enterEvent.data.dids;
    }
  }

  ngOnInit() {
/*     this.actRoute.queryParams.subscribe((params: {enterEvent:NavigateWithCompletionEnterData})=>{
      this.nextStepId = params.enterEvent.stepId;
      this.importedDids = params.enterEvent.data.dids;
    }) */
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('didsessions.select-identity'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key:'back', iconPath: BuiltInIcon.BACK });
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: "language", iconPath: BuiltInIcon.EDIT });
    this.titleBar.setNavigationMode(null);
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.uxService.onTitleBarItemClicked(icon);
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  selectDID(did) {
    this.selectedDid = did;
  }

  continue() {
    void this.identityService.runNextStep(this.nextStepId, this.selectedDid);
  }
}
