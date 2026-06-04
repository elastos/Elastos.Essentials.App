import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { PollDetailPage } from './poll-detail.page';
import { TranslateModule } from '@ngx-translate/core';
import { LedgerSignComponentModule } from 'src/app/wallet/components/ledger-sign/module';

const routes: Routes = [
  {
    path: '',
    component: PollDetailPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    TranslateModule,
    SharedComponentsModule,
    LedgerSignComponentModule
  ],
  declarations: [PollDetailPage]
})
export class PollDetailPageModule {}

