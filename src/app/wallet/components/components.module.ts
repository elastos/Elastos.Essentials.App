import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { QRCodeModule } from 'angularx-qrcode';
import { TranslateModule } from '@ngx-translate/core';
import { MyQrcodeComponent } from './my-qrcode/my-qrcode.component';
import { PaymentboxComponent } from './paymentbox/paymentbox.component';

@NgModule({
  declarations: [
    MyQrcodeComponent,
    PaymentboxComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    QRCodeModule,
    TranslateModule,
  ],
  exports: [
    MyQrcodeComponent,
    PaymentboxComponent
  ],
  providers: [
  ],
  entryComponents: [PaymentboxComponent],
})
export class ComponentsModule { }
