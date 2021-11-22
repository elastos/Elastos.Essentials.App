import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

@Component({ template: "<div></div>" })
export class EmptyPage  {}

const routes: Routes = [
  { path: 'launcher', loadChildren: './launcher/module#LauncherModule' },
  { path: 'didsessions', loadChildren: './didsessions/module#DIDSessionsModule' },
  { path: 'scanner', loadChildren: './scanner/module#ScannerModule' },
  { path: 'hivemanager', loadChildren: './hivemanager/module#HiveManagerModule' },
  { path: 'settings', loadChildren: './settings/module#SettingsModule' },
  { path: 'contacts', loadChildren: './contacts/module#ContactsModule' },
  { path: 'identity', loadChildren: './identity/module#IdentityModule' },
  { path: 'wallet', loadChildren: './wallet/module#WalletModule' },
  { path: 'dposvoting', loadChildren: './voting/dposvoting/module#DPoSVotingModule' },
  { path: 'dposregistration', loadChildren: './voting/dposregistration/module#DPoSRegistrationModule' },
  { path: 'crcouncilvoting', loadChildren: './voting/crcouncilvoting/module#CRCouncilVotingModule' },
  { path: 'crcouncilmanager', loadChildren: './voting/crcouncilmanager/module#CRCouncilManagerModule' },
  { path: 'crproposalvoting', loadChildren: './voting/crproposalvoting/module#CRProposalVotingModule' },
  { path: 'developertools', loadChildren: './developertools/module#DeveloperToolsModule' },
  { path: 'dappbrowser', loadChildren: './dappbrowser/module#DAppBrowserModule' },

  // Prevent angular from calling a random default route sometimes when starting,
  // leading to crashes if platform is not ready yet
  { path: '**', component: EmptyPage },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { enableTracing: false })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }