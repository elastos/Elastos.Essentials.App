import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { PaymentPlanComponent } from './payment-plan/payment-plan.component';
import { OrderComponent } from './order/order.component';

@NgModule({
  declarations: [PaymentPlanComponent, OrderComponent],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule
  ],
  exports: [PaymentPlanComponent, OrderComponent],
  providers: [
  ],
  entryComponents: [PaymentPlanComponent, OrderComponent],
})
export class ComponentsModule { }
