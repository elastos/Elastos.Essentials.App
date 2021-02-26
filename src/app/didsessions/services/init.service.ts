import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { TranslateService } from '@ngx-translate/core';
import { IdentityService } from './identity.service';
import { LanguageService } from './language.service';
import { UXService } from './ux.service';

@Injectable({
  providedIn: 'root'
})
export class DIDSessionsInitService {
  constructor(
    private identityService: IdentityService,
    private uxService: UXService,
    private language: LanguageService,
    private translate: TranslateService
  ) {}

  public async init(): Promise<void> {
    console.log("DID Sessions init service is initializing");

    this.translate.addLangs(["en"]);
    this.translate.use("en");
    this.translate.setDefaultLang("en");

    this.language.init();
    this.identityService.init();
    this.uxService.init();
  }
}
