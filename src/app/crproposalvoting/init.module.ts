import { NgModule } from '@angular/core';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { HttpClientModule } from '@angular/common/http';
import { PopupService } from './services/popup.service';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
  ],
  imports: [
    HttpClientModule,
    IonicModule,
    IonicStorageModule,
    TranslateModule
  ],
  bootstrap: [],
  entryComponents: [
  ],
  providers: [
    Platform,
    PopupService
  ],
  schemas: []
})
export class CRProposalVotingInitModule {}
