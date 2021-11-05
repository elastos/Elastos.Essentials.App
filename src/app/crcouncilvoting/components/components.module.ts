import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { OptionsComponent } from './options/options.component';

@NgModule({
  declarations: [
    OptionsComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule
  ],
  exports: [OptionsComponent],
  providers: [
  ],
  entryComponents: [OptionsComponent],
})
export class ComponentsModule { }
