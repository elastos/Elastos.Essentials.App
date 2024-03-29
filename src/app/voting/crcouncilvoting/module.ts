import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebView } from '@awesome-cordova-plugins/ionic-webview/ngx';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { GlobalDirectivesModule } from 'src/app/helpers/directives/module';
import { StdTransactionComponentModule } from 'src/app/wallet/components/std-transaction/module';
import { ComponentsModule } from './components/components.module';
import { RoundProgressModule } from './components/round-progress/round-progress.module';
import { CandidatePage } from './pages/candidate/candidate.page';
import { CandidatesPage } from './pages/candidates/candidates.page';
import { CRMemberPage } from './pages/crmember/crmember.page';
import { CRMembersPage } from './pages/crmembers/crmembers.page';
import { CRNodePage } from './pages/crnode/crnode.page';
import { HistoryPage } from './pages/history/history.page';
import { ImpeachCRMemberPage } from './pages/impeach/impeach.page';
import { NextCRPage } from './pages/nextcr/nextcr.page';
import { NextCRsPage } from './pages/nextcrs/nextcrs.page';
import { RegisterUpdatePage } from './pages/register-update/register-update.page';
import { CandidateRegistrationTermsPage } from './pages/registration-terms/registration-terms.page';
import { CRSecretaryPage } from './pages/secretary/secretary.page';
import { VotePage } from './pages/vote/vote.page';
import { CRCouncilVotingRoutingModule } from './routing';

@NgModule({
  declarations: [
    VotePage,
    CRMembersPage,
    CRMemberPage,
    CandidatesPage,
    CandidatePage,
    NextCRsPage,
    NextCRPage,
    RegisterUpdatePage,
    CandidateRegistrationTermsPage,
    HistoryPage,
    CRNodePage,
    ImpeachCRMemberPage,
    CRSecretaryPage,
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    CRCouncilVotingRoutingModule,
    SharedComponentsModule,
    StdTransactionComponentModule,
    RoundProgressModule,
    IonicModule,
    IonicStorageModule,
    TranslateModule,
    ComponentsModule,
    GlobalDirectivesModule
  ],
  bootstrap: [],
  entryComponents: [
  ],
  providers: [
    Platform,
    WebView
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CRCouncilVotingModule { }
