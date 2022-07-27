import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { WidgetContainerComponent } from './base/widget-container/widget-container.component';
import { WidgetHolderComponent } from './base/widget-holder/widget-holder.component';
import { IdentityWidget } from './builtin/identity/identity.widget';

@NgModule({
  declarations: [
    // Base
    WidgetContainerComponent,
    WidgetHolderComponent,

    // Widgets
    IdentityWidget
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule
  ],
  exports: [
    WidgetContainerComponent
  ],
  providers: [
  ],
  entryComponents: [
  ],
})
export class WidgetModule { }
