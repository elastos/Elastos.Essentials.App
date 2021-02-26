import { Component, NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

@Component({ template: "<div>Default root empty page</div>" })
export class EmptyPage  {}

const routes: Routes = [
  { path: 'launcher', loadChildren: './launcher/module#LauncherModule' },
  { path: 'didsessions', loadChildren: './didsessions/module#DIDSessionsModule' },
  { path: 'scanner', loadChildren: './scanner/module#ScannerModule' },
  { path: 'hivemanager', loadChildren: './hivemanager/module#HiveManagerModule' },

  { path: '**', component: EmptyPage },
  // Prevent angular from calling a random default route sometimes when starting, leading to crashes if platform is not ready yet
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes/*, { preloadingStrategy: PreloadAllModules }*/)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
