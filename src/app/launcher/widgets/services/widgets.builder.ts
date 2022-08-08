import { DragDrop, DragRef } from '@angular/cdk/drag-drop';
import { ComponentRef, TemplateRef, ViewContainerRef } from '@angular/core';
import { Logger } from 'src/app/logger';
import { WidgetHolderComponent } from '../base/widget-holder/widget-holder.component';
import { Widget } from '../base/widget.interface';
import { WidgetState } from '../base/widgetstate';
import { ActiveWalletWidget } from '../builtin/active-wallet/active-wallet.widget';
import { BackupIdentityWidget } from '../builtin/backup-identity/backup-identity.widget';
import { ContactsWidget } from '../builtin/contacts/contacts.widget';
import { DiscoverDAppsWidget } from '../builtin/discover-dapps/discover-dapps.widget';
import { EasyBridgeWidget } from '../builtin/easy-bridge/easy-bridge.widget';
import { ElastosVotingWidget } from '../builtin/elastos-voting/elastos-voting.widget';
import { HiveWidget } from '../builtin/hive/hive.widget';
import { IdentityWidget } from '../builtin/identity/identity.widget';
import { NewRedPacketsWidget } from '../builtin/new-red-packets/new-red-packets.widget';
import { RecentAppsWidget } from '../builtin/recent-apps/recent-apps.widget';
import { RedPacketsWidget } from '../builtin/red-packets/red-packets.widget';
import { SignOutWidget } from '../builtin/signout/signout.widget';
import { WalletConnectWidget } from '../builtin/wallet-connect/wallet-connect.widget';
import { PluginWidget } from '../plugins/plugin-widget/plugin.widget';

export class WidgetsBuilder {
    constructor(
    ) { }

    /**
     * Intanciates a widget from a persistent widget state, into the target UI container.
     *
     * Item is made draggable as part of a cdkDropList, only if dragDrop is set.
     */
    public static async appendWidgetFromState(containerName: string, widgetState: WidgetState, list: ViewContainerRef, container: ViewContainerRef, boundaries: ViewContainerRef, dragPlaceholder: TemplateRef<any>, dragDrop: DragDrop, insertionIndex: number = undefined): Promise<{ dragRef: DragRef<any>, widgetComponentInstance: Widget, widgetHolderComponentRef: ComponentRef<WidgetHolderComponent> }> {
        const forSelection = !dragDrop; // For now, "dragDrop" undefined or null means "preview mode"

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
        let widgetComponentClass; // Widget interface
        let widgetComponentInstance: Widget = null;
        if (widgetState.category === "builtin") {
            switch (widgetState.builtInType) {
                case "identity": widgetComponentClass = IdentityWidget; break;
                case "active-wallet": widgetComponentClass = ActiveWalletWidget; break;
                case "signout": widgetComponentClass = SignOutWidget; break;
                case "elastos-voting": widgetComponentClass = ElastosVotingWidget; break;
                case "recent-apps": widgetComponentClass = RecentAppsWidget; break;
                case "backup-identity": widgetComponentClass = BackupIdentityWidget; break;
                case "wallet-connect": widgetComponentClass = WalletConnectWidget; break;
                case "new-red-packets": widgetComponentClass = NewRedPacketsWidget; break;
                case "easy-bridge": widgetComponentClass = EasyBridgeWidget; break;
                case "contacts": widgetComponentClass = ContactsWidget; break;
                case "red-packets": widgetComponentClass = RedPacketsWidget; break;
                case "hive": widgetComponentClass = HiveWidget; break;
                case "discover-dapps": widgetComponentClass = DiscoverDAppsWidget; break;
                default:
                    Logger.warn("widgets", `Unhandled builtin widget type ${widgetState.builtInType}`);
            }

            let component = holder.instance.container.createComponent<typeof widgetComponentClass>(widgetComponentClass);
            widgetComponentInstance = component.instance;
            widgetComponentInstance.forSelection = forSelection; // Let the widget know where it will be used so it can adjust some UI

            holder.instance.attachWidgetComponent(widgetComponentInstance);

            return { dragRef, widgetComponentInstance, widgetHolderComponentRef: holder };
        }
        else {
            // Plugin
            let component = holder.instance.container.createComponent<PluginWidget>(PluginWidget);
            widgetComponentInstance = component.instance;
            const pluginWidgetComponentInstance = <PluginWidget>widgetComponentInstance;
            pluginWidgetComponentInstance.forSelection = forSelection; // Let the widget know where it will be used so it can adjust some UI
            pluginWidgetComponentInstance.attachWidgetState(widgetState);

            holder.instance.attachWidgetComponent(pluginWidgetComponentInstance);

            return { dragRef, widgetComponentInstance, widgetHolderComponentRef: holder };
        }
    }
}