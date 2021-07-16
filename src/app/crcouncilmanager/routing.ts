import { NgModule } from '@angular/core';
import { RouterModule, Routes }
 from '@angular/router';
import { CRCouncilManagerPage } from './pages/manager/manager.page';
import { CRCouncilRegistrationPage } from './pages/registration/registration.page';

const routes: Routes = [
  { path: 'registration', component: CRCouncilRegistrationPage },
  { path: 'manager', component: CRCouncilManagerPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CRCouncilManagerRoutingModule {}
