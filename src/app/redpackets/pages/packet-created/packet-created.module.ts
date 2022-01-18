import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { PacketCreatedPage } from './packet-created.page';



@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedComponentsModule,
    TranslateModule,
    RouterModule.forChild([
      {
        path: '',
        component: PacketCreatedPage
      }
    ])
  ],
  declarations: [PacketCreatedPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PacketCreatedPageModule { }
