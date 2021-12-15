import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CreateProposalPage } from './pages/intents/createproposal/createproposal';
import { CreateSuggestionPage } from './pages/intents/createsuggestion/createsuggestion';
import { ReviewMilestonePage } from './pages/intents/reviewmilestone/reviewmilestone';
import { ReviewProposalPage } from './pages/intents/reviewproposal/reviewproposal';
import { UpdatMilestonePage } from './pages/intents/updatemilestone/updatemilestone';
import { VoteForProposalPage } from './pages/intents/voteforproposal/voteforproposal';
import { WithdrawPage } from './pages/intents/withdraw/withdraw';
import { ProposalDetailPage } from './pages/proposal-detail/proposal-detail';
import { ProposalListPage } from './pages/proposal-list/proposal-list';
import { SuggestionDetailPage } from './pages/suggestion-detail/suggestion-detail';
import { SuggestionListPage } from './pages/suggestion-list/suggestion-list';


const routes: Routes = [
  {
    path: 'proposals/:proposalType', component: ProposalListPage
  },
  {
    path: 'proposal-details', component: ProposalDetailPage
  },
  {
    path: 'suggestions/:suggestionType', component: SuggestionListPage
  },
  {
    path: 'suggestion-detail', component: SuggestionDetailPage
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
