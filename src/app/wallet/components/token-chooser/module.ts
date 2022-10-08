import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { TokenChooserComponent } from './token-chooser.component';

@NgModule({
  declarations: [
    TokenChooserComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    SharedComponentsModule,
    TranslateModule
  ],
  exports: [
    TokenChooserComponent
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TokenChooserComponentModule { }
