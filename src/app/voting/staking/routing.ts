import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StakingHomePage } from './pages/home/home.page';
import { StakePage } from './pages/stake/stake.page';
import { UnstakePage } from './pages/unstake/unstake.page';
import { WithdrawPage } from './pages/withdraw/withdraw.page';

const routes: Routes = [
    { path: 'staking-home', component: StakingHomePage },
    { path: 'stake', component: StakePage },
    { path: 'unstake', component: UnstakePage },
    { path: 'withdraw', component: WithdrawPage },
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StakingRoutingModule {}
