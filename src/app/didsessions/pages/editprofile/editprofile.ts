import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonInput } from '@ionic/angular';
import { UXService } from 'src/app/didsessions/services/ux.service';
import { TranslateService } from '@ngx-translate/core';
import { IdentityService } from 'src/app/didsessions/services/identity.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';

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
  @ViewChild('input', {static: false}) input: IonInput;

  private nextStepId: number = null;
  public isEdit: boolean = false;
  public name: string = ""; // Name being edited

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    private uxService: UXService,
    public theme: GlobalThemeService,
    private translate: TranslateService,
    private identityService: IdentityService,
    private router: Router,
  ) {
    const navigation = this.router.getCurrentNavigation();
    if(navigation.extras.state) {
      this.nextStepId = navigation.extras.state.enterEvent.stepId;
      Logger.log('didsessions', 'Editprofile - nextStepId', this.nextStepId);
    }
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('didsessions.identity-name'));
    this.titleBar.setTheme('#f8f8ff', TitleBarForegroundMode.DARK);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key:'back', iconPath: BuiltInIcon.BACK });
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: "language", iconPath: BuiltInIcon.EDIT });
    this.titleBar.setNavigationMode(null);
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      this.uxService.onTitleBarItemClicked(icon);
    });
  }

  ionViewDidEnter() {
    setTimeout(() => {
      this.input.setFocus();
    }, 200);
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  async next() {
    if(this.checkParams()){
      this.identityService.runNextStep(this.nextStepId, this.name);
    }
  }

  checkParams(){
    if(!this.name || this.name == ""){
      this.uxService.toast_trans('name-is-missing');
      return false;
    }
    return true;
  }
}
