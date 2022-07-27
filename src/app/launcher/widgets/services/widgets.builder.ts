import { ViewContainerRef } from '@angular/core';
import { Logger } from 'src/app/logger';
import { WidgetState } from '../base/widgetcontainerstate';
import { IdentityWidget } from '../builtin/identity/identity.widget';

export class WidgetsBuilder {
    constructor(
    ) { }

    /**
     * Intanciates a widget from a persistent widget state, into the target UI container.
     */
    public static async appendWidgetFromState(widgetState: WidgetState, container: ViewContainerRef) {
        // Dynamic import for cyclic dependencies
        const WidgetHolderComponent = (await import("../base/widget-holder/widget-holder.component")).WidgetHolderComponent;

        // Create a transparent widget holder. This holde ris used in edition mode
        const holder = container.createComponent(WidgetHolderComponent);

        // Put the real widget in the holder
        let widgetComponentClass;
        if (widgetState.category === "builtin") {
            switch (widgetState.builtInType) {
                case "identity":
                    widgetComponentClass = IdentityWidget;
                    break;
                default:
                    Logger.log("widgets", `Unhandled builtin widget type ${widgetState.builtInType}`);
            }

            let componentInstance = holder.instance.container.createComponent<typeof widgetComponentClass>(widgetComponentClass);
        }
        else {
            // NOT IMPLEMENTED YET
        }
    }
}