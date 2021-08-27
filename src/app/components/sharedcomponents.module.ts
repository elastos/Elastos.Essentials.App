import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { TitleBarComponent } from './titlebar/titlebar.component';
import { TitlebarmenuitemComponent } from './titlebarmenuitem/titlebarmenuitem.component';
import { DIDPublishingComponent } from './did-publishing/did-publishing.component';
import { SwitchNetworkToElastosComponent } from './switch-network-to-elastos/switch-network-to-elastos.component';

@NgModule({
  declarations: [
    TitleBarComponent,
    TitlebarmenuitemComponent,
    DIDPublishingComponent,
    SwitchNetworkToElastosComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule
  ],
  exports: [
    TitleBarComponent, 
    TitlebarmenuitemComponent,
    DIDPublishingComponent,
    SwitchNetworkToElastosComponent
  ],
  providers: [
  ],
  entryComponents: [
    TitleBarComponent, 
    TitlebarmenuitemComponent,
    DIDPublishingComponent,
    SwitchNetworkToElastosComponent
  ],
})
export class SharedComponentsModule { }
