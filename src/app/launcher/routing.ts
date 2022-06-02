import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OnboardPage } from './pages/onboard/onboard.page';

@Component({ template: "<div>Launcher default route</div>" })
export class EmptyPage { }

const routes: Routes = [
  { path: 'onboard', component: OnboardPage },
  { path: 'home', loadChildren: () => import("./pages/home/module").then(m => m.HomePageModule) },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class LauncherRoutingModule { }
