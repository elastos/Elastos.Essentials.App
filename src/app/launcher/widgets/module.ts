import { DragDropModule } from "@angular/cdk/drag-drop";
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from "src/app/components/sharedcomponents.module";
import { GlobalDirectivesModule } from "src/app/helpers/directives/module";
import { WidgetContainerComponent } from './base/widget-container/widget-container.component';
import { WidgetHolderComponent } from './base/widget-holder/widget-holder.component';
import { ActiveWalletWidget } from "./builtin/active-wallet/active-wallet.widget";
import { BackupIdentityWidget } from "./builtin/backup-identity/backup-identity.widget";
import { ContactsWidget } from "./builtin/contacts/contacts.widget";
import { DiscoverDAppsWidget } from "./builtin/discover-dapps/discover-dapps.widget";
import { EasyBridgeWidget } from "./builtin/easy-bridge/easy-bridge.widget";
import { ElastosVotingWidget } from "./builtin/elastos-voting/elastos-voting.widget";
import { HiveWidget } from "./builtin/hive/hive.widget";
import { IdentityWidget } from './builtin/identity/identity.widget';
import { NewRedPacketsWidget } from "./builtin/new-red-packets/new-red-packets.widget";
import { RecentAppsWidget } from "./builtin/recent-apps/recent-apps.widget";
import { RedPacketsWidget } from "./builtin/red-packets/red-packets.widget";
import { SignOutWidget } from "./builtin/signout/signout.widget";
import { WalletConnectWidget } from "./builtin/wallet-connect/wallet-connect.widget";
import { PluginWidget } from "./plugins/plugin-widget/plugin.widget";
import { GalleryTemplate } from "./plugins/templates/gallery/gallery";
import { NewsTemplate } from "./plugins/templates/news/news";
import { PortalTemplate } from "./plugins/templates/portal/portal";
@NgModule({
  declarations: [
    // Base
    WidgetContainerComponent,
    WidgetHolderComponent,

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
    HiveWidget,
    DiscoverDAppsWidget,

    // Plugins 
    PluginWidget,
    PortalTemplate,
    NewsTemplate,
    GalleryTemplate
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule,
    DragDropModule,
    SharedComponentsModule,
    GlobalDirectivesModule
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
