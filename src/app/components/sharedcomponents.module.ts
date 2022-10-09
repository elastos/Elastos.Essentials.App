import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { GlobalDirectivesModule } from '../helpers/directives/module';
import { ConfirmationPopupComponent } from './confirmation-popup/confirmation-popup.component';
import { DIDPublishingComponent } from './did-publishing/did-publishing.component';
import { EButtonComponent } from './ebutton/ebutton.component';
import { MenuSheetComponent } from './menu-sheet/menu-sheet.component';
import { MnemonicKeypadComponent } from './mnemonic-keypad/mnemonic-keypad.component';
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
    ConfirmationPopupComponent,
    MnemonicKeypadComponent,
    MenuSheetComponent,
    EButtonComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule,
    GlobalDirectivesModule,
    InlineSVGModule
  ],
  exports: [
    TitleBarComponent,
    TitlebarmenuitemComponent,
    DIDPublishingComponent,
    SwitchNetworkComponent,
    RestartPromptComponent,
    ConfirmationPopupComponent,
    MnemonicKeypadComponent,
    MenuSheetComponent,
    EButtonComponent
  ],
  providers: [
    Clipboard
  ],
  entryComponents: [
    TitleBarComponent,
    TitlebarmenuitemComponent,
    DIDPublishingComponent,
    SwitchNetworkComponent,
    RestartPromptComponent,
    ConfirmationPopupComponent,
    MnemonicKeypadComponent,
    EButtonComponent
  ],
})
export class SharedComponentsModule { }
