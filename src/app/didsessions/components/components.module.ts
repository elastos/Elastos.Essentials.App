import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MnemonicPassCheckComponent } from './mnemonicpasscheck/mnemonicpasscheck.component';
import { WarningComponent } from './warning/warning.component';

@NgModule({
  declarations: [
    MnemonicPassCheckComponent,
    WarningComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule
  ],
  exports: [
    MnemonicPassCheckComponent,
    WarningComponent
  ],
  providers: [
  ],
  entryComponents: [
    MnemonicPassCheckComponent,
    WarningComponent
  ],
})
export class ComponentsModule { }
