import { DragDrop, DragRef, moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import { ComponentRef, Injectable, TemplateRef, ViewContainerRef } from '@angular/core';
import moment from 'moment';
import { BehaviorSubject } from 'rxjs';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { randomHex } from 'web3-utils';
import { PluginConfig } from '../base/plugin.types';
import { WidgetContainerComponent } from '../base/widget-container/widget-container.component';
import { WidgetHolderComponent } from '../base/widget-holder/widget-holder.component';
import { Widget } from '../base/widget.interface';
import { BuiltInWidgetType, DisplayCategories, WidgetContainerState, WidgetState } from '../base/widgetstate';
import { PluginWidget } from '../plugins/plugin-widget/plugin.widget';
import { WidgetsBuilder } from './widgets.builder';

const PERSISTENCE_CONTEXT = "launcher-widget";

const builtInWidgets: WidgetState[] = [
    { category: "builtin", builtInType: "identity", displayCategories: [DisplayCategories.IDENTITY] },
    { category: "builtin", builtInType: "active-wallet", displayCategories: [DisplayCategories.FINANCE] },
    { category: "builtin", builtInType: "signout", displayCategories: [DisplayCategories.IDENTITY] },
    { category: "builtin", builtInType: "elastos-voting", displayCategories: [DisplayCategories.ELASTOS] },
    { category: "builtin", builtInType: "recent-apps", displayCategories: [DisplayCategories.BROWSER] },
    { category: "builtin", builtInType: "wallet-connect", displayCategories: [DisplayCategories.FINANCE] },
    { category: "builtin", builtInType: "easy-bridge", displayCategories: [DisplayCategories.FINANCE] },
    { category: "builtin", builtInType: "contacts", displayCategories: [DisplayCategories.COMMUNITY] },
    { category: "builtin", builtInType: "red-packets", displayCategories: [DisplayCategories.COMMUNITY] },
    { category: "builtin", builtInType: "hive", displayCategories: [DisplayCategories.ELASTOS] },
    { category: "builtin", builtInType: "discover-dapps", displayCategories: [DisplayCategories.BROWSER] },
    { category: "builtin", builtInType: "new-red-packets", displayCategories: [DisplayCategories.COMMUNITY] },
    { category: "builtin", builtInType: "backup-identity", displayCategories: [DisplayCategories.IDENTITY] },
    { category: "builtin", builtInType: "hive-sync", displayCategories: [DisplayCategories.IDENTITY] },
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
        private dragDrop: DragDrop,
        private http: HttpClient,
        private globalNative: GlobalNativeService
    ) {
        WidgetsService.instance = this;
        // TMP DEBUG
        /* void this.deleteContainerState("left");
        void this.deleteContainerState("right");
        void this.deleteContainerState("main"); */
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
            // Generate and save a default configuration for the default container layout, if this is a well known default container name
            state = await this.generateDefaultContainerState(widgetContainerName);
        }

        return state;
    }

    private async saveContainerState(widgetContainerName: string, state: WidgetContainerState): Promise<void> {
        const key = "widget-container-state-" + widgetContainerName;
        await this.globalStorageService.setSetting(DIDSessionsStore.signedInDIDString, PERSISTENCE_CONTEXT, key, state);
    }

    private async deleteContainerState(widgetContainerName: string): Promise<void> {
        const key = "widget-container-state-" + widgetContainerName;
        await this.globalStorageService.deleteSetting(DIDSessionsStore.signedInDIDString, PERSISTENCE_CONTEXT, key);
    }

    /**
     * Restores a widget that was previously saved.
     * Called when the widgets container is instantiated.
     */
    public async restoreWidget(widgetContainer: WidgetContainerComponent, widget: WidgetState, widgetslist: ViewContainerRef, container: ViewContainerRef, boundaries: ViewContainerRef, dragPlaceholder: TemplateRef<any>): Promise<{ dragRef: DragRef, widgetHolderComponentRef: ComponentRef<WidgetHolderComponent>, widgetComponentInstance: Widget }> {
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
        //if (this.launcherHomeViewIsActive)
        //await widgetHolderComponentRef.instance.onWidgetInit?.();

        return { dragRef, widgetHolderComponentRef, widgetComponentInstance };
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

        let newWidgetState = this.createWidgetState(widgetStateConfig);

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
        //await widgetComponentInstance.onWidgetInit?.();

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
     * Creates a new widget state with a unique ID, based on a widget state config/
     */
    public createWidgetState(widgetStateConfig: WidgetState): WidgetState {
        // Clone the template state to make sure we don't edit its fields.
        let newWidgetState: WidgetState = Object.assign({}, widgetStateConfig);

        // Assign a unique ID
        newWidgetState.id = randomHex(8);

        return newWidgetState;
    }

    private createBuiltInWidgetState(builtInType: BuiltInWidgetType): WidgetState {
        let registeredBuiltInWidgetState = builtInWidgets.find(w => w.builtInType === builtInType);

        return this.createWidgetState({
            category: "builtin",
            builtInType,
            displayCategories: registeredBuiltInWidgetState.displayCategories
        });
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
     * Removes a widget from a widget container but not from the the persistance state.
     */
    public async removeWidget(widgetId: string): Promise<{ widgetInstance: WidgetInstance }> {
        // Find the widget
        let widgetIndex = this.componentsInstances.findIndex(w => w.widgetId === widgetId);
        let widgetInstance = this.componentsInstances[widgetIndex];

        // Deinit the holder and the widget
        await widgetInstance.holderComponentRef.instance.onWidgetDeinit?.();

        // Delete from UI
        await widgetInstance.container.onWidgetDeletion(widgetInstance, widgetInstance.holderComponentRef.hostView);

        return { widgetInstance };
    }

    /**
     * Deletes a widget from the model and sends an event to let the widget container know that
     * a removal from UI is needed too
     */
    public async deleteWidget(widgetId: string) {
        const { widgetInstance } = await this.removeWidget(widgetId);

        // Delete from state / model
        let state = await this.loadContainerState(widgetInstance.container.name);
        state.widgets = state.widgets.filter(w => w.id !== widgetId);
        await this.saveContainerState(widgetInstance.container.name, state);
    }

    /**
     * Updates a plugin widget with new data, usually after a new JSON content refresh.
     * Persistent model is updated, and UI as well.
     */
    public async updatePluginWidgetConfig(widgetId: string, newConfig: PluginConfig<any>): Promise<void> {
        // Retrieve the current model instance
        let widgetInstance = this.componentsInstances.find(w => w.widgetId === widgetId);

        // Update to disk, if this widget is a currently added widget in a real container.
        // (contrary to widgets shown in the widget chooser)
        if (widgetInstance.container.name) {
            let state = await this.loadContainerState(widgetInstance.container.name);

            let storedWidget = state.widgets.find(w => w.id === widgetId);
            storedWidget.plugin.lastFetched = moment().unix(); // Last updated: now
            storedWidget.plugin.json = newConfig;

            // Update the widget holder with new value
            (<PluginWidget>widgetInstance.widget).attachWidgetState(storedWidget);

            await this.saveContainerState(widgetInstance.container.name, state);
        }

        // Refresh the plugin component content with the new data (UI only)
        (<PluginWidget>widgetInstance.widget).config = newConfig;
    }

    /**
     * Lifecycle - launcher home is entering. We initialize widgets from here as well
     */
    /* public async onLauncherHomeViewWillEnter() {
        for (let instance of this.componentsInstances) {
            await instance.holderComponentRef.instance.onWidgetInit?.();
        }
        this.launcherHomeViewIsActive = true;
    } */

    /**
     * Lifecycle - launcher home is leaving. We deinit widgets from here as well
     */
    /* public async onLauncherHomeViewWillLeave() {
        this.launcherHomeViewIsActive = false;
        for (let instance of this.componentsInstances) {
            await instance.holderComponentRef.instance.onWidgetDeinit?.();
        }
    } */

    private generateDefaultContainerState(widgetContainerName: string): WidgetContainerState {
        let widgets: WidgetState[] = [];

        switch (widgetContainerName) {
            case "left":
                widgets.push(this.createBuiltInWidgetState("recent-apps"));
                widgets.push(this.createBuiltInWidgetState("wallet-connect"));
                widgets.push(this.createBuiltInWidgetState("signout"));
                break;
            case "main":
                widgets.push(this.createBuiltInWidgetState("identity"));
                widgets.push(this.createBuiltInWidgetState("new-red-packets"));
                widgets.push(this.createBuiltInWidgetState("backup-identity"));
                widgets.push(this.createBuiltInWidgetState("active-wallet"));
                widgets.push(this.createBuiltInWidgetState("hive-sync"));

                widgets.push(this.createBuiltInWidgetState("discover-dapps"));
                widgets.push(this.createBuiltInWidgetState("easy-bridge"));
                widgets.push(this.createBuiltInWidgetState("red-packets"));

                break;
            case "right":
                widgets.push(this.createBuiltInWidgetState("elastos-voting"));
                widgets.push(this.createBuiltInWidgetState("contacts"));
                widgets.push(this.createBuiltInWidgetState("hive"));
                break;
        }

        return {
            widgets
        };
    }
}