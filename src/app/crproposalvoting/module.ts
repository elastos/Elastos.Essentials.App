import { NgModule, ErrorHandler, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy, Platform } from '@ionic/angular';
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
import { StorageService } from './services/storage.service';
import { SharedComponentsModule } from '../components/sharedcomponents.module';

@NgModule({
  declarations: [
    // Pages
    ProposalListsHomePage,
    ProposalListingPage,
    ProposalDetailsPage,

    // Intents,
    CreateSuggestionPage,
    VoteForProposalPage,

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
    IonicStorageModule
  ],
  bootstrap: [],
  entryComponents: [
    // Pages
    ProposalListsHomePage,
    ProposalListingPage,
    ProposalDetailsPage,

    // Intents
    CreateSuggestionPage,
    VoteForProposalPage,

    // Components
    ProposalSearchResultComponent,
    VoteResultComponent
  ],
  providers: [
    Platform,
    StorageService,
    PopupService
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CRProposalVotingModule {}
