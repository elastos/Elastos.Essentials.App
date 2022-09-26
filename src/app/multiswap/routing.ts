import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

/* Without bottom tabs */
const routes: Routes = [
  { path: 'home', loadChildren: () => import('./pages/home/home.module').then(m => m.HomeModule) },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class MultiSwapRoutingModule { }
