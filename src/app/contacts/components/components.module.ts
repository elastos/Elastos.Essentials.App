import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    IonicModule,
    SharedComponentsModule,
    TranslateModule
  ],
  exports: [],
  providers: [
  ],
  entryComponents: [],
})
export class ComponentsModule { }
