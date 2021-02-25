import { Component, OnInit } from '@angular/core';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from 'src/app/services/theme.service';
import { TranslateService } from '@ngx-translate/core';
import { UXService } from '../../services/ux.service';
import { IdentityService, NextStep, NavigateWithCompletionEnterData } from '../../services/identity.service';
import { DID } from '../../model/did.model';
import { ActivatedRoute } from '@angular/router';
import { Events } from '../../services/events.service';

@Component({
  selector: 'app-chooseimporteddid',
  templateUrl: './chooseimporteddid.page.html',
  styleUrls: ['./chooseimporteddid.page.scss'],
})
export class ChooseImportedDIDPage implements OnInit {
  public importedDids: DID[] = [];
  public selectedDid: DID = null;
  private nextStepId: number = null;

  constructor(
    public languageService: LanguageService,
    public theme: ThemeService,
    private uxService: UXService,
    private identityService: IdentityService,
    private events: Events,
    private actRoute: ActivatedRoute,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.actRoute.queryParams.subscribe((params: {enterEvent:NavigateWithCompletionEnterData})=>{
      this.nextStepId = params.enterEvent.stepId;
      this.importedDids = params.enterEvent.data.dids;
    })
  }

  ionViewWillEnter() {
    // TODO @chad titleBarManager.setTitle(this.translate.instant("select-identity"));
    this.uxService.setTitleBarBackKeyShown(true);
  }

  ionViewWillLeave() {
  }

  selectDID(did) {
    this.selectedDid = did;
  }

  continue() {
    this.identityService.runNextStep(this.nextStepId, this.selectedDid);
  }
}
