import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MenuPage } from './pages/menu/menu.page';
import { LanguagePage } from './pages/language/language.page';
import { AboutPage } from './pages/about/about.page';
import { DeveloperPage } from './pages/developer/developer.page';
import { SelectNetPage } from './pages/select-net/select-net.page';
import { DevTestsPage } from './pages/devtests/devtests.page';
import { WalletConnectConnectPage } from './pages/walletconnect/connect/connect.page';
import { WalletConnectSessionsPage } from './pages/walletconnect/sessions/sessions.page';
import { WalletConnectPrepareToConnectPage } from './pages/walletconnect/preparetoconnect/preparetoconnect.page';

const routes: Routes = [
  { path: 'menu', component: MenuPage },
  { path: 'language', component: LanguagePage },
  { path: 'about', component: AboutPage },
  { path: 'developer', component: DeveloperPage },
  { path: 'select-net', component: SelectNetPage },
  { path: 'devtests', component: DevTestsPage },
  { path: 'walletconnect/sessions', component: WalletConnectSessionsPage },
  { path: 'walletconnect/preparetoconnect', component: WalletConnectPrepareToConnectPage },
  { path: 'walletconnect/connect', component: WalletConnectConnectPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingsRoutingModule {}

