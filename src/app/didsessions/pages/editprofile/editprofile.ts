import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonInput } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { IdentityService } from 'src/app/didsessions/services/identity.service';
import { UXService } from 'src/app/didsessions/services/ux.service';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

export type EditProfileStateParams = {
  onCompletion: Promise<string>;
}

@Component({
  selector: 'page-editprofile',
  templateUrl: 'editprofile.html',
  styleUrls: ['editprofile.scss']
})
export class EditProfilePage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
  @ViewChild('input', { static: false }) input: IonInput;

  private nextStepId: number = null;
  public isEdit = false;
  public name = ""; // Name being edited
  public creatingDid = false;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    private uxService: UXService,
    public theme: GlobalThemeService,
    private translate: TranslateService,
    private identityService: IdentityService,
    private router: Router,
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation.extras.state) {
      this.nextStepId = navigation.extras.state.enterEvent.stepId;
      Logger.log('didsessions', 'Editprofile - nextStepId', this.nextStepId);
    }
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('didsessions.identity-name'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: 'back', iconPath: BuiltInIcon.BACK });
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: "settings", iconPath: BuiltInIcon.SETTINGS });
    this.titleBar.setNavigationMode(null);
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      if (icon.key === 'back') {
        void this.identityService.runNextStep(this.nextStepId, null);
      }
      this.uxService.onTitleBarItemClicked(icon);
    });
  }

  ionViewDidEnter() {
    setTimeout(() => {
      void this.input.setFocus();
    }, 200);
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  async next() {
    this.creatingDid = true;
    if (this.checkParams()) {
        try {
            await this.identityService.runNextStep(this.nextStepId, this.name);
        }
        catch (e) {
            // TODO: org.spongycastle.crypto.InvalidCipherTextException: pad block corrupted.
            // It can work if try again.
            Logger.warn('didsessions', 'Editprofile - runNextStep exception:', e);
        }
    }
    this.creatingDid = false;
  }

  checkParams() {
    if (!this.name || this.name == "") {
      this.uxService.toast_trans('common.name-is-missing');
      return false;
    }
    return true;
  }
}
