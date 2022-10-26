import { DragDrop, DragRef } from '@angular/cdk/drag-drop';
import { ComponentRef, TemplateRef, ViewContainerRef } from '@angular/core';
import { Logger } from 'src/app/logger';
import type { WidgetHolderComponent } from '../base/widget-holder/widget-holder.component';
import { WidgetBase } from '../base/widgetbase';
import { WidgetState } from '../base/widgetstate';
import { WidgetPluginsService } from './plugin.service';

export class WidgetsBuilder {
    constructor(
    ) { }

    /**
     * Intanciates a widget from a persistent widget state, into the target UI container.
     *
     * Item is made draggable as part of a cdkDropList, only if dragDrop is set.
     */
    public static async appendWidgetFromState(containerName: string, widgetState: WidgetState, list: ViewContainerRef, container: ViewContainerRef, boundaries: ViewContainerRef, dragPlaceholder: TemplateRef<any>, dragDrop: DragDrop, insertionIndex: number = undefined): Promise<{ dragRef: DragRef<any>, widgetComponentInstance: WidgetBase, widgetHolderComponentRef: ComponentRef<WidgetHolderComponent> }> {
        const forSelection = !dragDrop; // For now, "dragDrop" undefined or null means "preview mode"

        // Plugin safety check - Make sure  we have a valid config in this widget
        let config = await WidgetPluginsService.instance.getPluginWidgetStateConfig(widgetState);
        if (widgetState.category === "app-plugin" && widgetState.plugin.pluginType === "standard") {
            if (!config) {
                Logger.warn("widgets", "appendWidgetFromState(): plugin widget has no or invalid config, skipping");
                return null;
            }
        }

        // Dynamic import for cyclic dependencies
        const WidgetHolderComponent = (await import("../base/widget-holder/widget-holder.component")).WidgetHolderComponent;

        // Create a transparent widget holder. This holde ris used in edition mode
        const holder = container.createComponent(WidgetHolderComponent, {
            index: insertionIndex // Insert at the top
        });

        if (!dragDrop) // Selection mode - configure the holder to forbid interaction on widgets content
            holder.instance.selecting = true;

        // Make the item draggable if dragDrop is set
        let dragRef: DragRef = null;
        if (!forSelection) {
            dragRef = dragDrop.createDrag(holder.instance.root)
                .withBoundaryElement(boundaries.element)
                .withHandles([holder.instance.dragHandle])
                .withPlaceholderTemplate({
                    template: dragPlaceholder,
                    viewContainer: list,
                    context: null
                })/* .withPreviewTemplate({
            template: dragPlaceholder,
            viewContainer: list,
            context: null,
            matchSize: true
        }) */;
        }

        // Attach container and widget info to this holder
        holder.instance.attachWidgetInfo(widgetState);

        // Put the real widget in the holder
        let widgetComponentClass = null; // Widget interface
        let widgetComponentInstance: WidgetBase = null;
        if (widgetState.category === "builtin") {
            switch (widgetState.builtInType) {
                // Dynamic imports for bundle split and avoid circular dependencies
                case "identity": widgetComponentClass = (await import("../builtin/identity/identity.widget")).IdentityWidget; break;
                case "active-wallet": widgetComponentClass = (await import("../builtin/active-wallet/active-wallet.widget")).ActiveWalletWidget; break;
                case "active-network-coin-price": widgetComponentClass = (await import("../builtin/active-network-coin-price/active-network-coin-price.widget")).ActiveNetworkCoinPriceWidget; break;
                case "choose-active-network": widgetComponentClass = (await import("../builtin/choose-active-network/choose-active-network.widget")).ChooseActiveNetworkWidget; break;
                case "signout": widgetComponentClass = (await import("../builtin/signout/signout.widget")).SignOutWidget; break;
                case "elastos-voting": widgetComponentClass = (await import("../builtin/elastos-voting/elastos-voting.widget")).ElastosVotingWidget; break;
                case "elastos-staking": widgetComponentClass = (await import("../builtin/elastos-staking/elastos-staking.widget")).ElastosStakingWidget; break;
                case "cyber-republic": widgetComponentClass = (await import("../builtin/cyber-republic/cyber-republic.widget")).CyberRepublicWidget; break;
                case "recent-apps": widgetComponentClass = (await import("../builtin/recent-apps/recent-apps.widget")).RecentAppsWidget; break;
                case "favorite-apps": widgetComponentClass = (await import("../builtin/favorite-apps/favorite-apps.widget")).FavoriteAppsWidget; break;
                case "backup-identity": widgetComponentClass = (await import("../builtin/backup-identity/backup-identity.widget")).BackupIdentityWidget; break;
                case "hive-sync": widgetComponentClass = (await import("../builtin/hive-sync/hive-sync.widget")).HiveSyncWidget; break;
                case "wallet-connect": widgetComponentClass = (await import("../builtin/wallet-connect/wallet-connect.widget")).WalletConnectWidget; break;
                case "new-red-packets": widgetComponentClass = (await import("../builtin/new-red-packets/new-red-packets.widget")).NewRedPacketsWidget; break;
                case "contacts": widgetComponentClass = (await import("../builtin/contacts/contacts.widget")).ContactsWidget; break;
                case "red-packets": widgetComponentClass = (await import("../builtin/red-packets/red-packets.widget")).RedPacketsWidget; break;
                case "hive": widgetComponentClass = (await import("../builtin/hive/hive.widget")).HiveWidget; break;
                case "discover-dapps": widgetComponentClass = (await import("../builtin/discover-dapps/discover-dapps.widget")).DiscoverDAppsWidget; break;
                case "notifications": widgetComponentClass = (await import("../builtin/notifications/notifications.widget")).NotificationsWidget; break;
                case "swap": widgetComponentClass = (await import("../builtin/swap/swap.widget")).SwapWidget; break;
                default:
                    Logger.warn("widgets", `Unhandled builtin widget type ${widgetState.builtInType}`);
            }
        }
        else {
            if (widgetState.plugin.pluginType === "standard") {
                // Standard plugin
                const PluginWidget = (await import("../plugins/plugin-widget/plugin.widget")).PluginWidget;
                widgetComponentClass = PluginWidget;
            }
            else if (widgetState.plugin.pluginType === "news") {
                // News plugin
                const NewsWidget = (await import('../builtin/news/news.widget')).NewsWidget;
                widgetComponentClass = NewsWidget;
            }
        }

        if (!widgetComponentClass)
            return null;

        let component = holder.instance.container.createComponent<typeof widgetComponentClass>(widgetComponentClass);
        widgetComponentInstance = component.instance;
        const pluginWidgetComponentInstance = widgetComponentInstance;
        pluginWidgetComponentInstance.forSelection = forSelection; // Let the widget know where it will be used so it can adjust some UI

        await pluginWidgetComponentInstance.attachWidgetState(widgetState);
        await pluginWidgetComponentInstance.attachHolder?.(holder.instance);

        holder.instance.attachWidgetComponent(pluginWidgetComponentInstance);

        return { dragRef, widgetComponentInstance, widgetHolderComponentRef: holder };
    }
}