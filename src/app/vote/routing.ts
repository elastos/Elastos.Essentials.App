import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SelectWalletPage } from './pages/select-wallet/select-wallet.page';

const routes: Routes = [
  { path: 'select-wallet', component: SelectWalletPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DPoSVotingRoutingModule {}
