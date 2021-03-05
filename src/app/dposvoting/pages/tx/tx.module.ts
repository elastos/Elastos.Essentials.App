import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicImageLoader } from 'ionic-image-loader';
import { NodeSliderComponent } from './node-slider/node-slider.component';

import { IonicModule } from '@ionic/angular';

import { TxPage } from './tx.page';

const routes: Routes = [
  {
    path: '',
    component: TxPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IonicImageLoader,
    RouterModule.forChild(routes)
  ],
  declarations: [TxPage, NodeSliderComponent]
})
export class TxPageModule {}
