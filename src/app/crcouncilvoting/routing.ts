import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { CandidatesPage } from './pages/candidates/candidates.page';
import { VotePage } from './pages/vote/vote.page';
import { HistoryPage } from './pages/history/history.page';

const routes: Routes = [
  { path: 'candidates', component: CandidatesPage },
  { path: 'vote', component: VotePage },
  { path: 'history', component: HistoryPage }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class CRCouncilVotingRoutingModule {}
