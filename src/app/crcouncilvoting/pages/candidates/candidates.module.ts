import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';
import { IonicImageLoader } from 'ionic-image-loader';

import { CandidatesPage } from './candidates.page';
import { CandidateSliderComponent } from '../../components/candidate-slider/candidate-slider.component';

const routes: Routes = [
  {
    path: '',
    component: CandidatesPage
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
  declarations: [CandidatesPage, CandidateSliderComponent]
})
export class CandidatesPageModule {}
