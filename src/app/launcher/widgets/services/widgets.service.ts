import { DragDrop, DragRef, moveItemInArray } from '@angular/cdk/drag-drop';
import { ComponentRef, Injectable, TemplateRef, ViewContainerRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { randomHex } from 'web3-utils';
import { WidgetContainerComponent } from '../base/widget-container/widget-container.component';
import { WidgetHolderComponent } from '../base/widget-holder/widget-holder.component';
import { Widget } from '../base/widget.interface';
import { WidgetContainerState, WidgetState } from '../base/widgetcontainerstate';
import { WidgetsBuilder } from './widgets.builder';

const PERSISTENCE_CONTEXT = "launcher-widget";

const builtInWidgets: WidgetState[] = [
    { category: "builtin", builtInType: "identity" },
    { category: "builtin", builtInType: "active-wallet" },
    { category: "builtin", builtInType: "signout" },
    { category: "builtin", builtInType: "elastos-voting" },
    { category: "builtin", builtInType: "recent-apps" },
    { category: "builtin", builtInType: "wallet-connect" },
    { category: "builtin", builtInType: "easy-bridge" },
    { category: "builtin", builtInType: "contacts" },
    { category: "builtin", builtInType: "red-packets" },
    { category: "builtin", builtInType: "hive" },
    { category: "builtin", builtInType: "new-red-packets" },
    { category: "builtin", builtInType: "backup-identity" },
];

export type WidgetInstance = {
    widgetId: string; // Reference widget ID
    widget: Widget; // Widget component instance (Angular Component implementing our widget interface)
    holderComponentRef: ComponentRef<any>; // Angular's UI element root for the widget HOLDER instance
    container: WidgetContainerComponent;
}

@Injectable({
    providedIn: 'root'
})
export class WidgetsService {
    public static instance: WidgetsService;

    public editionMode = new BehaviorSubject(false);

    // List of widget components instantiated, so we can call the lifecycle on them
    private componentsInstances: WidgetInstance[] = [];

    private launcherHomeViewIsActive = false;

    constructor(
        private globalStorageService: GlobalStorageService,
        private dragDrop: DragDrop
    ) {
        WidgetsService.instance = this;
        // TMP DEBUG
        /* void this.saveContainerState("left", {
            widgets: []
        }); */
    }

    public getAvailableBuiltInWidgets(): WidgetState[] {
        return builtInWidgets;
    }

    /**
     * Toggle widgets edition mode globally for all home screen sub-screens / all widgets.
     */
    public toggleEditionMode() {
        const currentEditionMode = this.editionMode.value;
        this.editionMode.next(!currentEditionMode);
    }

    public exitEditionMode() {
        this.editionMode.next(false);
    }

    /**
     * Loads widget container state from disk. i.e. list of widgets it contains.
     */
    public async loadContainerState(widgetContainerName: string): Promise<WidgetContainerState> {
        const key = "widget-container-state-" + widgetContainerName;
        let state = <WidgetContainerState>await this.globalStorageService.getSetting(DIDSessionsStore.signedInDIDString, PERSISTENCE_CONTEXT, key, null);

        if (!state) {
            // TODO: generate and save a default configuration for the default container layout.
            // TEMP: just return empty list
            return {
                widgets: []
            }
        }

        return state;
    }

    private async saveContainerState(widgetContainerName: string, state: WidgetContainerState): Promise<void> {
        const key = "widget-container-state-" + widgetContainerName;
        await this.globalStorageService.setSetting(DIDSessionsStore.signedInDIDString, PERSISTENCE_CONTEXT, key, state);
    }

    /**
     * Restores a widget that was previously saved.
     * Called when the widgets container is instantiated.
     */
    public async restoreWidget(widgetContainer: WidgetContainerComponent, widget: WidgetState, widgetslist: ViewContainerRef, container: ViewContainerRef, boundaries: ViewContainerRef, dragPlaceholder: TemplateRef<any>): Promise<{ dragRef: DragRef, widgetHolderComponentRef: ComponentRef<WidgetHolderComponent> }> {
        let { dragRef, widgetComponentInstance, widgetHolderComponentRef } = await WidgetsBuilder.appendWidgetFromState(widgetContainer.name, widget, widgetslist, container, boundaries, dragPlaceholder, this.dragDrop);
        this.componentsInstances.push({
            widgetId: widget.id,
            widget: widgetComponentInstance,
            holderComponentRef: widgetHolderComponentRef,
            container: widgetContainer
        });

        // When this method is called, the launcher viewWillEnter() can be already called or not called yet.
        // If the launcher is already entered: initialize the component.
        // If not, the component will be initialized later when home enters.
        if (this.launcherHomeViewIsActive)
            await widgetComponentInstance.onWidgetInit?.();

        return { dragRef, widgetHolderComponentRef };
    }

    /**
     * Adds a new widget to the container model.
     * Called by user to add new widgets after picking a widget state from the widget chooser.
     */
    public async addWidget(widgetStateConfig: WidgetState, widgetContainer: WidgetContainerComponent, list: ViewContainerRef, container: ViewContainerRef, boundaries: ViewContainerRef, dragPlaceholder: TemplateRef<any>, forSelection = false): Promise<{ dragRef: DragRef, widgetHolderComponentRef: ComponentRef<WidgetHolderComponent> }> {
        // If we add a widget for selection, we add widgets in the end, to show them in ther order they are defined.
        // For live mode, adding a new widget is always done at the top of the list.
        let insertAtTop = false;
        if (!forSelection)
            insertAtTop = true;

        // Clone the template state to make sure we don't edit its fields.
        let newWidgetState: WidgetState = Object.assign({}, widgetStateConfig);

        // Assign a unique ID
        newWidgetState.id = randomHex(8);

        let { dragRef, widgetComponentInstance, widgetHolderComponentRef } = await WidgetsBuilder.appendWidgetFromState(
            widgetContainer.name,
            newWidgetState,
            list,
            container, boundaries,
            dragPlaceholder,
            !forSelection ? this.dragDrop : null, // Don't make the item draggable if in selection mode.
            insertAtTop ? 0 : undefined // Insert at the top if ndded
        );

        this.componentsInstances.push({
            widgetId: newWidgetState.id,
            widget: widgetComponentInstance,
            holderComponentRef: widgetHolderComponentRef,
            container: widgetContainer
        });
        await widgetComponentInstance.onWidgetInit?.();

        // Live mode, not preview? Then save the sate
        if (!forSelection) {
            // Add to container state
            let state = await this.loadContainerState(widgetContainer.name);
            if (insertAtTop)
                state.widgets.unshift(newWidgetState); // New widget, insert first
            else
                state.widgets.push(newWidgetState); // Other cases, insert last

            // Save container to disk
            await this.saveContainerState(widgetContainer.name, state);
        }

        return { dragRef, widgetHolderComponentRef };
    }

    /**
     * Moves a widget in the model and saves the state to disk.
     * Calling UI component is reponsible for moving items on UI.
     */
    public async moveWidget(widgetContainerName: string, previousIndex: number, currentIndex: number) {
        let state = await this.loadContainerState(widgetContainerName);
        moveItemInArray(state.widgets, previousIndex, currentIndex);
        await this.saveContainerState(widgetContainerName, state);
    }

    /**
     * Deletes a widget from the model and sends an event to let the widget container know that
     * a removal from UI is needed too
     */
    public async deleteWidget(widgetId: string) {
        // Find the widget
        let widgetIndex = this.componentsInstances.findIndex(w => w.widgetId === widgetId);
        let widgetInstance = this.componentsInstances[widgetIndex];

        // Deinit the widget
        await widgetInstance.widget.onWidgetDeinit?.();

        // Delete from UI
        await widgetInstance.container.onWidgetDeletion(widgetInstance, widgetInstance.holderComponentRef.hostView);

        // Delete from state / model
        let state = await this.loadContainerState(widgetInstance.container.name);
        state.widgets = state.widgets.filter(w => w.id !== widgetId);
        await this.saveContainerState(widgetInstance.container.name, state);
    }

    /**
     * Lifecycle - launcher home is entering. We initialize widgets from here as well
     */
    public async onLauncherHomeViewWillEnter() {
        for (let instance of this.componentsInstances) {
            await instance.widget.onWidgetInit?.();
        }
        this.launcherHomeViewIsActive = true;
    }

    /**
     * Lifecycle - launcher home is leaving. We deinit widgets from here as well
     */
    public async onLauncherHomeViewWillLeave() {
        this.launcherHomeViewIsActive = false;
        for (let instance of this.componentsInstances) {
            await instance.widget.onWidgetDeinit?.();
        }
    }
}