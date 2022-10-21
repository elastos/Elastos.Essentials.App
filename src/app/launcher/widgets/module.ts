import { DragDropModule } from "@angular/cdk/drag-drop";
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { InlineSVGModule } from "ng-inline-svg-2";
import { SharedComponentsModule } from "src/app/components/sharedcomponents.module";
import { GlobalDirectivesModule } from "src/app/helpers/directives/module";
import { TokenChooserComponentModule } from "src/app/multiswap/components/token-chooser/module";
import { ColorChooserComponent } from "./base/color-chooser/color-chooser.component";
import { WidgetContainerComponent } from './base/widget-container/widget-container.component';
import { WidgetHolderComponent } from './base/widget-holder/widget-holder.component';
import { ActiveNetworkCoinPriceWidget } from "./builtin/active-network-coin-price/active-network-coin-price.widget";
import { ActiveWalletWidget } from "./builtin/active-wallet/active-wallet.widget";
import { BackupIdentityWidget } from "./builtin/backup-identity/backup-identity.widget";
import { ChooseActiveNetworkWidget } from "./builtin/choose-active-network/choose-active-network.widget";
import { ContactsWidget } from "./builtin/contacts/contacts.widget";
import { CyberRepublicWidget } from "./builtin/cyber-republic/cyber-republic.widget";
import { DiscoverDAppsWidget } from "./builtin/discover-dapps/discover-dapps.widget";
import { ElastosStakingWidget } from "./builtin/elastos-staking/elastos-staking.widget";
import { ElastosVotingWidget } from "./builtin/elastos-voting/elastos-voting.widget";
import { FavoriteAppsWidget } from "./builtin/favorite-apps/favorite-apps.widget";
import { HiveSyncWidget } from "./builtin/hive-sync/hive-sync.widget";
import { HiveWidget } from "./builtin/hive/hive.widget";
import { IdentityWidget } from './builtin/identity/identity.widget';
import { NewRedPacketsWidget } from "./builtin/new-red-packets/new-red-packets.widget";
import { NewsConfiguratorComponentsModule } from "./builtin/news/components/configurator/module";
import { FullNewsPage } from "./builtin/news/components/fullnews/fullnews.page";
import { NewsWidget } from "./builtin/news/news.widget";
import { NotificationsWidget } from "./builtin/notifications/notifications.widget";
import { RecentAppsWidget } from "./builtin/recent-apps/recent-apps.widget";
import { RedPacketsWidget } from "./builtin/red-packets/red-packets.widget";
import { SignOutWidget } from "./builtin/signout/signout.widget";
import { SwapWidget } from "./builtin/swap/swap.widget";
import { WalletConnectWidget } from "./builtin/wallet-connect/wallet-connect.widget";
import { PluginWidget } from "./plugins/plugin-widget/plugin.widget";
import { GalleryTemplate } from "./plugins/templates/gallery/gallery";
import { PortalTemplate } from "./plugins/templates/portal/portal";
import { TokenPriceTemplate } from "./plugins/templates/tokenprice/tokenprice";
@NgModule({
  declarations: [
    // Base
    WidgetContainerComponent,
    WidgetHolderComponent,
    ColorChooserComponent,

    // Widgets
    IdentityWidget,
    ActiveWalletWidget,
    SignOutWidget,
    ElastosVotingWidget,
    ElastosStakingWidget,
    CyberRepublicWidget,
    RecentAppsWidget,
    WalletConnectWidget,
    BackupIdentityWidget,
    HiveSyncWidget,
    NewRedPacketsWidget,
    ContactsWidget,
    RedPacketsWidget,
    HiveWidget,
    DiscoverDAppsWidget,
    ActiveNetworkCoinPriceWidget,
    ChooseActiveNetworkWidget,
    NotificationsWidget,
    NewsWidget,
    FullNewsPage,
    FavoriteAppsWidget,
    SwapWidget,

    // Plugins
    PluginWidget,
    PortalTemplate,
    GalleryTemplate,
    TokenPriceTemplate
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule,
    DragDropModule,
    SharedComponentsModule,
    GlobalDirectivesModule,
    NewsConfiguratorComponentsModule,
    TokenChooserComponentModule,
    InlineSVGModule
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
