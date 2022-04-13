import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

/* Without bottom tabs */
const routes: Routes = [
  { path: 'rootedwarning', loadChildren: () => import('./pages/rootedwarning/rootedwarning.module').then(m => m.RootedWarningModule) },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class SecurityRoutingModule { }
