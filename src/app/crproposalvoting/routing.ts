import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { ProposalListsHomePage } from './pages/proposal-lists/home/home';
import { ProposalListingPage } from './pages/proposal-lists/listing/listing';
import { ProposalDetailsPage } from './pages/proposal-details/proposal-details';
import { CreateSuggestionPage } from './pages/intents/createsuggestion/createsuggestion';
import { VoteForProposalPage } from './pages/intents/voteforproposal/voteforproposal';

const routes: Routes = [
/*   {
    path: 'proposals', component: ProposalListsHomePage,
    children: [
      {
        path: ':proposalType',
        component: ProposalListingPage,
      },
    ],
  }, */
  {
    path: 'proposals/:proposalType', component: ProposalListingPage,
  },
  {
    path: 'proposal-details', component: ProposalDetailsPage
  },
  // Intents
  {
    path: 'create-suggestion-intent', component: CreateSuggestionPage
  },
  {
    path: 'vote-for-proposal-intent', component: VoteForProposalPage
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class CRProposalVotingRoutingModule {}
