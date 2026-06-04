import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { 
    path: 'home', 
    loadChildren: () => import('./pages/home/home.module').then(x => x.HomePageModule) 
  },
  { 
    path: 'poll/:id', 
    loadChildren: () => import('./pages/poll-detail/poll-detail.module').then(x => x.PollDetailPageModule) 
  },
  { 
    path: '', 
    redirectTo: 'home', 
    pathMatch: 'full' 
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MainchainPollsRoutingModule {}

