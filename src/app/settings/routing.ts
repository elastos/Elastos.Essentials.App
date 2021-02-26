import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MenuPage } from './pages/menu/menu.page';
import { LanguagePage } from './pages/language/language.page';
import { AboutPage } from './pages/about/about.page';
import { DeveloperPage } from './pages/developer/developer.page';
import { SelectNetPage } from './pages/select-net/select-net.page';

const routes: Routes = [
  { path: 'menu', component: MenuPage },
  { path: 'language', component: LanguagePage },
  { path: 'about', component: AboutPage },
  { path: 'developer', component: DeveloperPage },
  { path: 'select-net', component: SelectNetPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingsRoutingModule {}

