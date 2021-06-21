import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProposalListsHomePage } from './pages/proposal-lists/home/home';
import { ProposalListingPage } from './pages/proposal-lists/listing/listing';
import { ProposalDetailsPage } from './pages/proposal-details/proposal-details';
import { CreateSuggestionPage } from './pages/intents/createsuggestion/createsuggestion';
import { VoteForProposalPage } from './pages/intents/voteforproposal/voteforproposal';
import { CreateProposalPage } from './pages/intents/createproposal/createproposal';
import { ReviewProposalPage } from './pages/intents/reviewproposal/reviewproposal';
import { UpdatMilestonePage } from './pages/intents/updatemilestone/updatemilestone';
import { ReviewMilestonePage } from './pages/intents/reviewmilestone/reviewmilestone';
import { WithdrawPage } from './pages/intents/withdraw/withdraw';

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
    path: 'createsuggestion', component: CreateSuggestionPage
  },
  {
    path: 'createproposal', component: CreateProposalPage
  },
  {
    path: 'reviewproposal', component: ReviewProposalPage
  },
  {
    path: 'voteforproposal', component: VoteForProposalPage
  },
  {
    path: 'updatemilestone', component: UpdatMilestonePage
  },
  {
    path: 'reviewmilestone', component: ReviewMilestonePage
  },
  {
    path: 'withdraw', component: WithdrawPage
  },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class CRProposalVotingRoutingModule {}
