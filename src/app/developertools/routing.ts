import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { HomePage } from './pages/home/home';
import { CreateAppPage } from './pages/createapp/createapp';
import { AppDetailsPage } from './pages/appdetails/appdetails';

const routes: Routes = [
  { path: 'home', component: HomePage },
  { path: 'createapp', component: CreateAppPage },
  { path: 'appdetails', component: AppDetailsPage }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class DeveloperToolsRoutingModule {}
