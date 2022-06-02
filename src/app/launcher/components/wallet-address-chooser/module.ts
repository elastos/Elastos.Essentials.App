import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { WalletAddressChooserComponent } from './wallet-address-chooser.component';

@NgModule({
  declarations: [
    WalletAddressChooserComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule
  ],
  exports: [
    WalletAddressChooserComponent
  ],
  providers: [
  ],
  entryComponents: [
    WalletAddressChooserComponent
  ],
})
export class WalletAddressChooserComponentsModule { }
