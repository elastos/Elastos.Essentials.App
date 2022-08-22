import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from './services/auth-guard.service';

@Component({ template: "<div></div>" })
export class EmptyPage { }

const routes: Routes = [
  { path: 'launcher', loadChildren: () => import('./launcher/module').then(x => x.LauncherModule), canActivate: [AuthGuardService] },
  { path: 'didsessions', loadChildren: () => import('./didsessions/module').then(x => x.DIDSessionsModule) },
  { path: 'scanner', loadChildren: () => import('./scanner/module').then(x => x.ScannerModule) },
  { path: 'hivemanager', loadChildren: () => import('./hivemanager/module').then(x => x.HiveManagerModule), canActivate: [AuthGuardService] },
  { path: 'settings', loadChildren: () => import('./settings/module').then(x => x.SettingsModule), canActivate: [AuthGuardService] },
  { path: 'contacts', loadChildren: () => import('./contacts/module').then(x => x.ContactsModule), canActivate: [AuthGuardService] },
  { path: 'identity', loadChildren: () => import('./identity/module').then(x => x.IdentityModule), canActivate: [AuthGuardService] },
  { path: 'wallet', loadChildren: () => import('./wallet/module').then(x => x.WalletModule), canActivate: [AuthGuardService] },
  { path: 'dposvoting', loadChildren: () => import('./voting/dposvoting/module').then(x => x.DPoSVotingModule), canActivate: [AuthGuardService] },
  { path: 'dposregistration', loadChildren: () => import('./voting/dposregistration/module').then(x => x.DPoSRegistrationModule), canActivate: [AuthGuardService] },
  { path: 'crcouncilvoting', loadChildren: () => import('./voting/crcouncilvoting/module').then(x => x.CRCouncilVotingModule), canActivate: [AuthGuardService] },
  { path: 'crproposalvoting', loadChildren: () => import('./voting/crproposalvoting/module').then(x => x.CRProposalVotingModule), canActivate: [AuthGuardService] },
  { path: 'developertools', loadChildren: () => import('./developertools/module').then(x => x.DeveloperToolsModule), canActivate: [AuthGuardService] },
  { path: 'dappbrowser', loadChildren: () => import('./dappbrowser/module').then(x => x.DAppBrowserModule), canActivate: [AuthGuardService] },
  { path: 'redpackets', loadChildren: () => import('./redpackets/module').then(x => x.RedPacketsModule), canActivate: [AuthGuardService] },
  { path: 'security', loadChildren: () => import('./security/module').then(x => x.SecurityModule) },
  { path: 'migrator', loadChildren: () => import('./migrator/module').then(x => x.MigratorModule) },
  { path: 'easybridge', loadChildren: () => import('./easybridge/module').then(x => x.EasyBridgeModule) },
  { path: 'multiswap', loadChildren: () => import('./multiswap/module').then(x => x.MultiSwapModule) },

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