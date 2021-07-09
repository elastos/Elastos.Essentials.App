import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DPosRegistrationPage } from './pages/registration/registration.page';
import { DPosUnRegistrationPage } from './pages/unregistration/unregistration.page';

const routes: Routes = [
  { path: 'registration', component: DPosRegistrationPage },
  { path: 'unregistration', component: DPosUnRegistrationPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DPoSRegistrationRoutingModule {}
