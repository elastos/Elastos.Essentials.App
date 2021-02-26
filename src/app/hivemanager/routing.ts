import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PickProviderPage } from './pages/pickprovider/pickprovider.page';
import { SignInPage } from './pages/signin/signin.page';
import { AdminProvidersListPage } from './pages/admin/adminproviderslist/adminproviderslist.page';
import { AdminProviderEditPage } from './pages/admin/adminprovideredit/adminprovideredit.page';
import { PickPlanPage } from './pages/pickplan/pickplan.page';
import { PickPlanPurchasePage } from './pages/pickplanpurchase/pickplanpurchase.page';

const routes: Routes = [
  { path: 'signin', component: SignInPage },
  { path: 'pickprovider', component: PickProviderPage },
  { path: 'pickplan', component: PickPlanPage },
  { path: 'pickplanpurchase', component: PickPlanPurchasePage },
  { path: 'adminproviderslist', component: AdminProvidersListPage },
  { path: 'adminprovideredit', component: AdminProviderEditPage }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
