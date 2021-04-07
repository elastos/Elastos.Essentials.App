import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePage } from './pages/home/home.page';
import { OnboardPage } from './pages/onboard/onboard.page';

@Component({ template: "<div>Launcher default route</div>" })
export class EmptyPage  {}

const routes: Routes = [
  { path: 'onboard', component: OnboardPage },
  { path: 'home', component: HomePage },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class LauncherRoutingModule { }
