import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MnemonicPassCheckComponent } from './mnemonicpasscheck/mnemonicpasscheck.component';

@NgModule({
  declarations: [
    MnemonicPassCheckComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule
  ],
  exports: [
    MnemonicPassCheckComponent,
  ],
  providers: [
  ],
  entryComponents: [
    MnemonicPassCheckComponent,
  ],
})
export class ComponentsModule { }
