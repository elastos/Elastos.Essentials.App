import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

@Component({ template: "<div>Default root empty page</div>" })
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
  { path: 'dposvoting', loadChildren: './dposvoting/module#DPoSVotingModule' },

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
