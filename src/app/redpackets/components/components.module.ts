import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { GrabPacketComponent } from './grab-packet/grab-packet.component';
import { PacketPreviewComponent } from './packet-preview/packet-preview.component';

@NgModule({
  declarations: [
    PacketPreviewComponent,
    GrabPacketComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule,
    SharedComponentsModule,
    FormsModule
  ],
  exports: [
    PacketPreviewComponent,
    GrabPacketComponent
  ],
  providers: [
  ],
  entryComponents: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ComponentsModule { }
