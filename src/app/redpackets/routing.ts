import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

/* With bottom tabs */
/* const routes: Routes = [
  { path: '', loadChildren: './pages/menu/menu.module#MenuPageModule'},
]; */

/* Without bottom tabs */
const routes: Routes = [
  { path: 'home', loadChildren: () => import('./pages/home/home.module').then(m => m.HomeModule) },
  { path: 'new', loadChildren: () => import('./pages/new-packet/new-packet.module').then(m => m.NewPacketModule) },
  { path: 'pay', loadChildren: () => import('./pages/pay/pay.module').then(m => m.PayModule) },
  { path: 'packet-details', loadChildren: () => import('./pages/packet-details/packet-details.module').then(m => m.PacketDetailsPageModule) },
  { path: 'my-packets', loadChildren: () => import('./pages/my-packets/my-packets.module').then(m => m.MyPacketsModule) },
  { path: 'opened-packets', loadChildren: () => import('./pages/opened-packets/opened-packets.module').then(m => m.OpenedPacketsModule) },
  { path: 'packet-created', loadChildren: () => import('./pages/packet-created/packet-created.module').then(m => m.PacketCreatedPageModule) },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class RedPacketsRoutingModule { }
