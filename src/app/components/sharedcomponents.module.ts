import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { DIDPublishingComponent } from './did-publishing/did-publishing.component';
import { RestartPromptComponent } from './restart-prompt/restart-prompt.component';
import { SwitchNetworkToElastosComponent } from './switch-network-to-elastos/switch-network-to-elastos.component';
import { TitleBarComponent } from './titlebar/titlebar.component';
import { TitlebarmenuitemComponent } from './titlebarmenuitem/titlebarmenuitem.component';

@NgModule({
  declarations: [
    TitleBarComponent,
    TitlebarmenuitemComponent,
    DIDPublishingComponent,
    SwitchNetworkToElastosComponent,
    RestartPromptComponent
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
    SwitchNetworkToElastosComponent,
    RestartPromptComponent
  ],
  providers: [
  ],
  entryComponents: [
    TitleBarComponent,
    TitlebarmenuitemComponent,
    DIDPublishingComponent,
    SwitchNetworkToElastosComponent,
    RestartPromptComponent
  ],
})
export class SharedComponentsModule { }
