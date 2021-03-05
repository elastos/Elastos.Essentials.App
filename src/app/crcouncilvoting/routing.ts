import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'home', loadChildren: './pages/home/home.module#HomePageModule' },
  { path: 'candidates', loadChildren: './pages/candidates/candidates.module#CandidatesPageModule' },
  { path: 'vote', loadChildren: './pages/vote/vote.module#VotePageModule' },
  { path: 'history', loadChildren: './pages/history/history.module#HistoryPageModule' },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
