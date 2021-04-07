import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ScanPage } from './pages/scan/scan.page';

const routes: Routes = [
  { path: 'scan', component: ScanPage }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class ScannerRoutingModule {}
