import { Component, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NavController, IonInput, ModalController } from '@ionic/angular';
import { UXService } from 'src/app/didsessions/services/ux.service';
import { TranslateService } from '@ngx-translate/core';
import { IdentityService, NavigateWithCompletionEnterData } from 'src/app/didsessions/services/identity.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

export type EditProfileStateParams = {
  onCompletion: Promise<string>;
}

@Component({
  selector: 'page-editprofile',
  templateUrl: 'editprofile.html',
  styleUrls: ['editprofile.scss']
})
export class EditProfilePage {

  @ViewChild('input', {static: false}) input: IonInput;

  private nextStepId: number = null;
  public isEdit: boolean = false;
  public name: string = ""; // Name being edited

  constructor(
    private uxService: UXService,
    public theme: GlobalThemeService,
    private translate: TranslateService,
    private identityService: IdentityService,
    private actRoute: ActivatedRoute,
  ) {
  }

  ngOnInit() {
    this.actRoute.queryParams.subscribe((params: {enterEvent:NavigateWithCompletionEnterData})=>{
      this.nextStepId = params.enterEvent.stepId;
    })
  }

  ionViewWillEnter() {
    this.uxService.setTitleBarBackKeyShown(true);
    // TODO @chad titleBarManager.setTitle(this.translate.instant('identity-name'));
  }

  ionViewDidEnter() {
    setTimeout(() => {
      this.input.setFocus();
    }, 200);
  }

  ionViewWillLeave() {
    this.uxService.setTitleBarBackKeyShown(false);
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
