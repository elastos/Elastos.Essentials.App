import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { TitleBarComponent } from './titlebar/titlebar.component';
import { TitlebarmenuitemComponent } from './titlebarmenuitem/titlebarmenuitem.component';

@NgModule({
  declarations: [
    TitleBarComponent,
    TitlebarmenuitemComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule
  ],
  exports: [TitleBarComponent, TitlebarmenuitemComponent],
  providers: [
  ],
  entryComponents: [TitleBarComponent, TitlebarmenuitemComponent],
})
export class SharedComponentsModule { }
