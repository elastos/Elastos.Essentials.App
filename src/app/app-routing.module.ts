import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from './services/auth-guard.service';

@Component({ template: "<div></div>" })
export class EmptyPage { }

const routes: Routes = [
  { path: 'launcher', loadChildren: './launcher/module#LauncherModule', canActivate: [AuthGuardService] },
  { path: 'didsessions', loadChildren: './didsessions/module#DIDSessionsModule' },
  { path: 'scanner', loadChildren: './scanner/module#ScannerModule' },
  { path: 'hivemanager', loadChildren: './hivemanager/module#HiveManagerModule', canActivate: [AuthGuardService] },
  { path: 'settings', loadChildren: './settings/module#SettingsModule', canActivate: [AuthGuardService] },
  { path: 'contacts', loadChildren: './contacts/module#ContactsModule', canActivate: [AuthGuardService] },
  { path: 'identity', loadChildren: './identity/module#IdentityModule', canActivate: [AuthGuardService] },
  { path: 'wallet', loadChildren: './wallet/module#WalletModule', canActivate: [AuthGuardService] },
  { path: 'dposvoting', loadChildren: './voting/dposvoting/module#DPoSVotingModule', canActivate: [AuthGuardService] },
  { path: 'dposregistration', loadChildren: './voting/dposregistration/module#DPoSRegistrationModule', canActivate: [AuthGuardService] },
  { path: 'crcouncilvoting', loadChildren: './voting/crcouncilvoting/module#CRCouncilVotingModule', canActivate: [AuthGuardService] },
  { path: 'crcouncilmanager', loadChildren: './voting/crcouncilmanager/module#CRCouncilManagerModule', canActivate: [AuthGuardService] },
  { path: 'crproposalvoting', loadChildren: './voting/crproposalvoting/module#CRProposalVotingModule', canActivate: [AuthGuardService] },
  { path: 'developertools', loadChildren: './developertools/module#DeveloperToolsModule', canActivate: [AuthGuardService] },
  { path: 'dappbrowser', loadChildren: './dappbrowser/module#DAppBrowserModule', canActivate: [AuthGuardService] },
  { path: 'redpackets', loadChildren: './redpackets/module#RedPacketsModule', canActivate: [AuthGuardService] },

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