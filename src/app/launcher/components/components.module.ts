import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { OptionsComponent } from './options/options.component';
import { WalletAddressChooserComponent } from './wallet-address-chooser/wallet-address-chooser.component';

@NgModule({
  declarations: [
    OptionsComponent,
    WalletAddressChooserComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule
  ],
  exports: [
    OptionsComponent,
    WalletAddressChooserComponent
  ],
  providers: [
  ],
  entryComponents: [
    OptionsComponent,
    WalletAddressChooserComponent
  ],
})
export class ComponentsModule { }
