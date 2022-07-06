import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { AngularDelegate, ModalController, Platform } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { EasyBridgeRoutingModule } from './routing';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    EasyBridgeRoutingModule,
    SharedComponentsModule,
    TranslateModule
  ],
  exports: [],
  bootstrap: [],
  entryComponents: [],
  providers: [
    ModalController,
    AngularDelegate,
    Platform
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // Needed to find ion-back-button, etc
})
export class EasyBridgeModule { }
