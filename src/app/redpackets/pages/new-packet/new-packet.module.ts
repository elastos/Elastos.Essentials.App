import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { TokenChooserComponentModule } from 'src/app/wallet/components/token-chooser/module';
import { ComponentsModule as WalletComponentsModule } from '../../../wallet/components/components.module';
import { ComponentsModule } from '../../components/components.module';
import { NewPacketPage } from './new-packet';

@NgModule({
  declarations: [NewPacketPage],
  imports: [
    ComponentsModule,
    WalletComponentsModule,
    CommonModule,
    IonicModule,
    FormsModule,
    TranslateModule,
    SharedComponentsModule,
    TokenChooserComponentModule,
    InlineSVGModule,
    RouterModule.forChild([{ path: '', component: NewPacketPage }])
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class NewPacketModule { }
