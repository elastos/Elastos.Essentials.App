import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ConfirmationPopupComponent } from './confirmation-popup/confirmation-popup.component';
import { DIDPublishingComponent } from './did-publishing/did-publishing.component';
import { RestartPromptComponent } from './restart-prompt/restart-prompt.component';
import { SwitchNetworkComponent } from './switch-network/switch-network.component';
import { TitleBarComponent } from './titlebar/titlebar.component';
import { TitlebarmenuitemComponent } from './titlebarmenuitem/titlebarmenuitem.component';

@NgModule({
  declarations: [
    TitleBarComponent,
    TitlebarmenuitemComponent,
    DIDPublishingComponent,
    SwitchNetworkComponent,
    RestartPromptComponent,
    ConfirmationPopupComponent
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
    SwitchNetworkComponent,
    RestartPromptComponent,
    ConfirmationPopupComponent
  ],
  providers: [
  ],
  entryComponents: [
    TitleBarComponent,
    TitlebarmenuitemComponent,
    DIDPublishingComponent,
    SwitchNetworkComponent,
    RestartPromptComponent,
    ConfirmationPopupComponent
  ],
})
export class SharedComponentsModule { }
