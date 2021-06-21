import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DPosRegistrationPage } from './pages/registration/registration.page';

const routes: Routes = [
  { path: 'registration', component: DPosRegistrationPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DPoSRegistrationRoutingModule {}
