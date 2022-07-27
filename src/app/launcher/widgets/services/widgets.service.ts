import { Injectable, ViewContainerRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { WidgetContainerState, WidgetState } from '../base/widgetcontainerstate';
import { WidgetsBuilder } from './widgets.builder';

const PERSISTENCE_CONTEXT = "launcher-widget";

@Injectable({
    providedIn: 'root'
})
export class WidgetsService {
    public editionMode = new BehaviorSubject(false);

    constructor(
        private globalStorageService: GlobalStorageService
    ) { }

    /**
     * Toggle widgets edition mode globally for all home screen sub-screens / all widgets.
     */
    public toggleEditionMode() {
        const currentEditionMode = this.editionMode.value;
        this.editionMode.next(!currentEditionMode);
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
     * Opens the widget selector. Once a widget tempalte is selected,
     * the widget gets added to the given container
     */
    public async addWidget(widgetContainerName: string, container: ViewContainerRef) {
        const newWidgetState: WidgetState = {
            category: "builtin",
            builtInType: "identity"
        };

        WidgetsBuilder.appendWidgetFromState(newWidgetState, container);
        //identityComponent.instance.text = "coucou"

        // Add to container state
        let state = await this.loadContainerState(widgetContainerName);
        state.widgets.push(newWidgetState);

        // Save container to disk
        await this.saveContainerState(widgetContainerName, state);
    }
}