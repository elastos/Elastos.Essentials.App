import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { TokenChooserComponent } from './token-chooser.component';

@NgModule({
  declarations: [
    TokenChooserComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule,
    FormsModule
  ],
  exports: [
    TokenChooserComponent
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TokenChooserComponentModule { }
