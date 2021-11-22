import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CandidatesPage } from './pages/candidates/candidates.page';
import { CRMemberPage } from './pages/crmember/crmember.page';
import { CRNodePage } from './pages/crnode/crnode.page';
import { HistoryPage } from './pages/history/history.page';
import { ImpeachCRMemberPage } from './pages/impeach/impeach.page';
import { VotePage } from './pages/vote/vote.page';

const routes: Routes = [
  { path: 'candidates', component: CandidatesPage },
  { path: 'crmember/:did', component: CRMemberPage },
  { path: 'impeach', component: ImpeachCRMemberPage },
  { path: 'vote', component: VotePage },
  { path: 'history', component: HistoryPage },
  { path: 'crnode', component: CRNodePage },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class CRCouncilVotingRoutingModule {}
