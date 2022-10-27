import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NodeDetailPage } from './pages/node-detail/node-detail.page';
import { DPoS2RegistrationPage } from './pages/registration/registration.page';
import { VotePage } from './pages/vote/vote.page';

const routes: Routes = [
  { path: '', loadChildren: () => import('./pages/menu/menu.module').then(x => x.MenuPageModule) },
  { path: 'registration', component: DPoS2RegistrationPage },
  { path: 'update', component: DPoS2RegistrationPage },
  { path: 'node-detail', component: NodeDetailPage },
  { path: 'vote', component: VotePage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DPoS2RoutingModule {}
