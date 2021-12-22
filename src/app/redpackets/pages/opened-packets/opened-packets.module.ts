import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { OpenedPacketsPage } from './opened-packets';

@NgModule({
  declarations: [OpenedPacketsPage],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    TranslateModule,
    SharedComponentsModule,
    RouterModule.forChild([{
      path: '',
      component: OpenedPacketsPage,
    }])
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class OpenedPacketsModule { }
