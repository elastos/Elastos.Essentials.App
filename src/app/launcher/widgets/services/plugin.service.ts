import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { JSONObject } from 'src/app/model/json';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { PluginConfig } from '../base/plugin.types';
import { DisplayCategories, WidgetState } from '../base/widgetcontainerstate';
import { WidgetsService } from './widgets.service';

type ValidationResult = {
    isValid: boolean;
    error?: string;
}

type CustomWidgetsList = {
    [url: string]: WidgetState;
}

@Injectable({
    providedIn: 'root'
})
export class WidgetPluginsService {
    public static instance: WidgetPluginsService;

    public onAvailableCustomPluginsListChanged = new Subject<void>();

    constructor(
        private http: HttpClient,
        private globalNative: GlobalNativeService,
        private globalStorageService: GlobalStorageService
    ) {
        WidgetPluginsService.instance = this;
    }

    /**
     * Fetches a custom widget plugin JSON from a remote location (external dapp)
     * and returns a widget state ready to be used
     */
    public fetchWidgetPlugin(widgetUrl: string): Promise<WidgetState> {
        Logger.log("widgets", "Fetching widget plugin at:", widgetUrl);

        return new Promise(resolve => {
            this.http.get(widgetUrl).subscribe({
                next: (json) => {
                    let widgetState = WidgetsService.instance.createWidgetState({
                        category: "app-plugin",
                        displayCategories: [DisplayCategories.DAPPS]
                    });

                    // Validate json format
                    const validationResult = this.validatePluginConfig(<PluginConfig<any>>json);
                    if (!validationResult.isValid) {
                        this.globalNative.errToast("Invalid widget configuration. " + validationResult.error);
                        resolve(null);
                    }
                    else {
                        try {
                            widgetState.plugin = {
                                url: widgetUrl,
                                json: <JSONObject>json
                            }

                            resolve(widgetState);
                        }
                        catch (e) {
                            this.globalNative.errToast("Invalid widget content returned, not JSON format");
                            resolve(null);
                        }
                    }
                },
                error: err => {
                    Logger.error("widgets", "Failed to fetch widget JSON", err);
                    this.globalNative.errToast("Failed to fetch plugin data. Is this a valid url?");
                    resolve(null);
                }
            });
        })
    }

    public validatePluginConfig(inputConfig: PluginConfig<any>): ValidationResult {
        if (!this.ensureNonEmptyString(inputConfig.logo))
            return this.erroredValidationResult("logo field is missing or not a valid picture url or base64");

        if (!this.ensureEnumString(inputConfig.contenttype, ["portal", "gallery", "news"]))
            return this.erroredValidationResult("contenttype field is missing or unsupported");

        if (!this.ensureObject(inputConfig.content))
            return this.erroredValidationResult("content field is missing or empty");

        // TODO: other validations such as items format and optional fields values

        return { isValid: true };
    }

    private ensureNonEmptyString(field: any): boolean {
        return !!field && typeof (field) === "string" && field !== "";
    }

    private ensureObject(field: any): boolean {
        return !!field && typeof (field) === "object" && Object.keys(field).length > 0;
    }

    private ensureEnumString(field: any, authorizedValues: string[]): boolean {
        if (!field || typeof (field) !== "string")
            return false;

        return authorizedValues.includes(field);
    }

    private erroredValidationResult(error: string): ValidationResult {
        return { isValid: false, error };
    }

    public getPluginWidgetStateConfig(widgetState: WidgetState): PluginConfig<any> {
        if (!widgetState || !widgetState.plugin || !widgetState.plugin.json)
            return null;

        return <PluginConfig<any>>widgetState.plugin.json;
    }

    /**
     * - Fetch the latest JSON content for the given plugin
     * - Asks the widget service to persist the data and the update the current model/ui
     */
    public async refreshPluginContent(widgetState: WidgetState) {
        const fetchedState = await this.fetchWidgetPlugin(widgetState.plugin.url);

        if (fetchedState) {
            await WidgetsService.instance.updatePluginWidgetConfig(widgetState.id, <PluginConfig<any>>fetchedState.plugin.json);
        }
    }

    /**
     * Adds / updates a plugin widget just fetched to the list of available widgets for the choose.
     * This way, user is able to add this plugin again later to the UI without scanning the plugin
     * qr code or pasting its url.
     */
    public async saveDAppPluginAsAvailableWidget(widgetState: WidgetState): Promise<void> {
        let list = await this.loadCustomPluginsList();
        list[widgetState.plugin.url] = widgetState;
        await this.saveCustomPluginsList(list);

        this.onAvailableCustomPluginsListChanged.next();
    }

    public async removeDAppPluginFromAvailableWidgets(widgetState: WidgetState): Promise<void> {
        let list = await this.loadCustomPluginsList();
        delete list[widgetState.plugin.url];
        await this.saveCustomPluginsList(list);

        this.onAvailableCustomPluginsListChanged.next();
    }

    public async loadCustomPluginsList(): Promise<CustomWidgetsList> {
        const key = "custom-plugin-widgets";
        let list = <CustomWidgetsList>await this.globalStorageService.getSetting(DIDSessionsStore.signedInDIDString, "widgets", key, {});
        return list;
    }

    private async saveCustomPluginsList(list: CustomWidgetsList): Promise<void> {
        const key = "custom-plugin-widgets";
        await this.globalStorageService.setSetting(DIDSessionsStore.signedInDIDString, "widgets", key, list);
    }
}