import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { CRProposalVotingRoutingModule } from './routing';

import { ProposalListsHomePage } from './pages/proposal-lists/home/home';
import { ProposalListingPage } from './pages/proposal-lists/listing/listing';
import { HttpClientModule } from '@angular/common/http';
import { ProposalSearchResultComponent } from './components/proposal-search-result/proposal-search-result.component';
import { ProposalDetailsPage } from './pages/proposal-details/proposal-details';
import { VoteResultComponent } from './components/vote-result/vote-result.component';
import { CreateSuggestionPage } from './pages/intents/createsuggestion/createsuggestion';
import { PopupService } from './services/popup.service';
import { VoteForProposalPage } from './pages/intents/voteforproposal/voteforproposal';
import { FormsModule } from '@angular/forms';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { TranslateModule } from '@ngx-translate/core';
import { CreateProposalPage } from './pages/intents/createproposal/createproposal';
import { ReviewProposalPage } from './pages/intents/reviewproposal/reviewproposal';
import { UpdatMilestonePage } from './pages/intents/updatemilestone/updatemilestone';
import { ReviewMilestonePage } from './pages/intents/reviewmilestone/reviewmilestone';
import { WithdrawPage } from './pages/intents/withdraw/withdraw';

@NgModule({
  declarations: [
    // Pages
    ProposalListsHomePage,
    ProposalListingPage,
    ProposalDetailsPage,

    // Intents,
    CreateSuggestionPage,
    CreateProposalPage,
    ReviewProposalPage,
    VoteForProposalPage,
    UpdatMilestonePage,
    ReviewMilestonePage,
    WithdrawPage,

    // Components
    ProposalSearchResultComponent,
    VoteResultComponent
  ],
  imports: [
    CommonModule,
    CRProposalVotingRoutingModule,
    HttpClientModule,
    SharedComponentsModule,
    FormsModule,
    IonicModule,
    IonicStorageModule,
    TranslateModule
  ],
  bootstrap: [],
  entryComponents: [
    // Pages
    ProposalListsHomePage,
    ProposalListingPage,
    ProposalDetailsPage,

    // Intents
    CreateSuggestionPage,
    CreateProposalPage,
    ReviewProposalPage,
    VoteForProposalPage,
    UpdatMilestonePage,
    ReviewMilestonePage,
    WithdrawPage,

    // Components
    ProposalSearchResultComponent,
    VoteResultComponent
  ],
  providers: [
    Platform,
    PopupService
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CRProposalVotingModule {}
