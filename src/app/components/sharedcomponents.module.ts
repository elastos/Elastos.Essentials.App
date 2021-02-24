import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { TitleBarComponent } from './titlebar/titlebar.component';

@NgModule({
  declarations: [
    TitleBarComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule
  ],
  exports: [TitleBarComponent],
  providers: [
  ],
  entryComponents: [TitleBarComponent],
})
export class SharedComponentsModule { }
