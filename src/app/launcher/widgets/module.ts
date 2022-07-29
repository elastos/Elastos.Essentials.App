import { DragDropModule } from "@angular/cdk/drag-drop";
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from "src/app/components/sharedcomponents.module";
import { WidgetChooserComponent } from "./base/widget-chooser/widget-chooser.component";
import { WidgetContainerComponent } from './base/widget-container/widget-container.component';
import { WidgetHolderComponent } from './base/widget-holder/widget-holder.component';
import { ActiveWalletWidget } from "./builtin/active-wallet/active-wallet.widget";
import { BackupIdentityWidget } from "./builtin/backup-identity/backup-identity.widget";
import { ContactsWidget } from "./builtin/contacts/contacts.widget";
import { EasyBridgeWidget } from "./builtin/easy-bridge/easy-bridge.widget";
import { ElastosVotingWidget } from "./builtin/elastos-voting/elastos-voting.widget";
import { HiveWidget } from "./builtin/hive/hive.widget";
import { IdentityWidget } from './builtin/identity/identity.widget';
import { NewRedPacketsWidget } from "./builtin/new-red-packets/new-red-packets.widget";
import { RecentAppsWidget } from "./builtin/recent-apps/recent-apps.widget";
import { RedPacketsWidget } from "./builtin/red-packets/red-packets.widget";
import { SignOutWidget } from "./builtin/signout/signout.widget";
import { WalletConnectWidget } from "./builtin/wallet-connect/wallet-connect.widget";
@NgModule({
  declarations: [
    // Base
    WidgetContainerComponent,
    WidgetHolderComponent,
    WidgetChooserComponent,

    // Widgets
    IdentityWidget,
    ActiveWalletWidget,
    SignOutWidget,
    ElastosVotingWidget,
    RecentAppsWidget,
    WalletConnectWidget,
    BackupIdentityWidget,
    NewRedPacketsWidget,
    EasyBridgeWidget,
    ContactsWidget,
    RedPacketsWidget,
    HiveWidget
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule,
    DragDropModule,
    SharedComponentsModule
  ],
  exports: [
    WidgetContainerComponent
  ],
  providers: [
  ],
  entryComponents: [
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class WidgetModule { }
