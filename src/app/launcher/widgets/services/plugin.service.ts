import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { JSONObject } from '@elastosfoundation/did-js-sdk';
import moment from 'moment';
import { Subject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { NewsContent, PluginConfig } from '../base/pluginconfig';
import { WidgetState } from '../base/widgetstate';

const PERSISTENCE_CONTEXT = "launcher-widget-plugins";

type ValidationResult = {
    isValid: boolean;
    error?: string;
}

type CustomWidgetsList = {
    [url: string]: WidgetState;
}

/**
 * Entry (persistence) that holds info about a plugin url and the last time it was fetched
 */
type DatedPluginSource = {
    url: string; // Plugin's JSON content remote address, where we can refresh the content
    lastFetched: number; // Timestamp at which the JSON content was last fetched. So we know when to refresh it.
}

/**
 * Root entry (persistence) for the plugins cache
 */
type PluginsState = {
    sources: DatedPluginSource[];
}

@Injectable({
    providedIn: 'root'
})
export class WidgetPluginsService implements GlobalService {
    public static instance: WidgetPluginsService;

    public onAvailableCustomPluginsListChanged = new Subject<void>();
    public onPluginUrlRefreshed = new Subject<string>(); // Event emitted when a plugin url has been refreshed - UI can refresh widgets based on this

    private state: PluginsState = null;

    constructor(
        private http: HttpClient,
        private globalNative: GlobalNativeService,
        private globalStorageService: GlobalStorageService
    ) {
        WidgetPluginsService.instance = this;
        GlobalServiceManager.getInstance().registerService(this);
    }

    async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        await this.loadPluginsState();
    }

    onUserSignOut(): Promise<void> {
        this.state = null;
        return;
    }

    /**
     * Blocking init that must be called before trying to generate widgets, as it prepares the plugins state/data cache.
     */
    public init() {

    }

    public getState(): PluginsState {
        return this.state;
    }

    public getLastFetched(url: string): number {
        let source = this.getDatedPluginSource(url);
        if (!source)
            return null;

        return source.lastFetched;
    }

    private getDatedPluginSource(url: string) {
        if (!this.state) // Should not happen, just in case
            return null;

        return this.state.sources.find(source => source.url === url);
    }

    /**
     * Fetches a custom widget plugin JSON from a remote location (external dapp) and
     * returns the fetched content.
     */
    public fetchWidgetPlugin(widgetUrl: string): Promise<PluginConfig<any>> {
        Logger.log("widgets-plugins", "Fetching widget plugin at:", widgetUrl);

        return new Promise((resolve, reject) => {
            this.http.get(widgetUrl).subscribe({
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                next: async (json) => {
                    Logger.log("widget-plugins", "Got widget plugin data:", json);

                    // Validate json format
                    const validationResult = this.validatePluginConfig(<PluginConfig<any>>json);
                    if (!validationResult.isValid) {
                        return reject("Invalid widget configuration. " + validationResult.error);
                    }
                    else {
                        // Content fetched, update plugin state/cache
                        await this.savePluginContent(widgetUrl, <PluginConfig<any>>json);

                        return resolve(<PluginConfig<any>>json);
                    }
                },
                error: err => {
                    reject("Failed to fetch plugin data. Is this a valid url?");
                }
            });
        })
    }

    public validatePluginConfig(inputConfig: PluginConfig<any>): ValidationResult {
        if (!this.ensureNonEmptyString(inputConfig.logo))
            return this.erroredValidationResult("logo field is missing or not a valid picture url or base64");

        if (!this.ensureNonEmptyString(inputConfig.projectname))
            return this.erroredValidationResult("projectname field is missing");

        if (!this.ensureEnumString(inputConfig.contenttype, [
            "portal",
            "gallery",
            "news",
            "tokenprice"
        ]))
            return this.erroredValidationResult("contenttype field is missing or unsupported");

        if (!this.ensureObject(inputConfig.content))
            return this.erroredValidationResult("content field is missing or empty");


        let subResult: ValidationResult = null;
        switch (inputConfig.contenttype) {
            case "news":
                subResult = this.validateNewsContent(<PluginConfig<NewsContent>>inputConfig)
                break;
            default:
                break;
        }

        if (subResult && !subResult.isValid)
            return subResult;

        // TODO: other validations such as items format and optional fields values

        return { isValid: true };
    }

    private ensureNonEmptyString(field: any): boolean {
        return !!field && typeof (field) === "string" && field !== "";
    }

    private ensureNumber(field: any): boolean {
        return !!field && typeof (field) === "number" && field > 0;
    }

    private ensureObject(field: any): boolean {
        return !!field && typeof (field) === "object" && Object.keys(field).length > 0;
    }

    private ensureArray(field: any): boolean {
        return !!field && field instanceof Array;
    }

    private ensureEnumString(field: any, authorizedValues: string[]): boolean {
        if (!field || typeof (field) !== "string")
            return false;

        return authorizedValues.includes(field);
    }

    private validateNewsContent(inputConfig: PluginConfig<NewsContent>): ValidationResult {
        if (!this.ensureArray(inputConfig.content.items))
            return this.erroredValidationResult("items field is missing or empty");

        let items = inputConfig.content.items;
        for (let item of items) {
            if (!this.ensureNonEmptyString(item.title))
                return this.erroredValidationResult("title is missing or empty in one of the news items");
            if (!this.ensureNonEmptyString(item.info))
                return this.erroredValidationResult("info is missing or empty in one of the news items");
            if (!this.ensureNumber(item.timevalue))
                return this.erroredValidationResult("timevalue is missing or empty in one of the news items");
        }
    }

    private erroredValidationResult(error: string): ValidationResult {
        return { isValid: false, error };
    }

    /**
     * Returns the last known JSON content for a given plugin url.
     * Does NOT fetch any content.
     */
    public getPluginContent(url: string): Promise<PluginConfig<any>> {
        let source = this.getDatedPluginSource(url);
        if (!source) {
            // Unknown source, no content known
            return null;
        }

        // Load the content form disk
        const key = "plugin-content-" + url;
        return this.globalStorageService.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, PERSISTENCE_CONTEXT, key, null);
    }

    public async getPluginWidgetStateConfig(widgetState: WidgetState): Promise<PluginConfig<any>> {
        if (!widgetState || !widgetState.plugin || !widgetState.plugin.url)
            return null;

        let content = await this.getPluginContent(widgetState.plugin.url);

        return content;
    }

    private async savePluginContent(url: string, content: JSONObject) {
        // Save content to disk
        const key = "plugin-content-" + url;
        await this.globalStorageService.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, PERSISTENCE_CONTEXT, key, content);

        // Upsert plugin state
        let existingEntry = this.getDatedPluginSource(url);
        if (!existingEntry) {
            // No existing? Create a new entry
            existingEntry = {
                url,
                lastFetched: moment().unix()
            }
            this.state.sources.push(existingEntry);
        }
        else {
            // Update the entry with the current date.
            existingEntry.lastFetched = moment().unix();
        }

        await this.savePluginsState(this.state);
    }

    /**
     * Loads the list of known plugins from disk
     */
    public async loadPluginsState(): Promise<void> {
        let defaultState: PluginsState = {
            sources: []
        };

        const key = "plugins-state";
        this.state = <PluginsState>await this.globalStorageService.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, PERSISTENCE_CONTEXT, key, defaultState);
    }

    private async savePluginsState(state: PluginsState): Promise<void> {
        const key = "plugins-state";
        await this.globalStorageService.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, PERSISTENCE_CONTEXT, key, state);
    }

    /**
     * Based on the list of previously added custom plugin urls, returns a list of
     * widgetState entries usable to add as preview items to add those custom widgets again.
     */
    public async getAvailableCustomWidgets(): Promise<CustomWidgetsList> {
        let list: CustomWidgetsList = {};
        for (let source of this.state.sources) {
            let content = await this.getPluginContent(source.url);
            if (content) {
                // Exclude news widgets from the list, as they are managed differently (like built-in widgets).
                if (content.contenttype === "news")
                    continue;

                let widgetState: WidgetState = {
                    category: "app-plugin",
                    displayCategories: null,
                    plugin: {
                        url: source.url,
                        pluginType: "standard"
                    }
                }
                list[source.url] = widgetState;
            }
        }
        return list;
    }

    /**
     * Calls refreshPluginContent but only if enough time has elapsed since the previous refresh, based on the delay specific
     * in the widget configuration.
     */
    /* public async refreshPluginContentIfRightTime(widgetState: WidgetState): Promise<void> {
        const lastFetched = moment.unix(widgetState.plugin.lastFetched || 0);
        const now = moment();
        const pluginConfig = this.getPluginWidgetStateConfig(widgetState);
        const refreshDelaySec = pluginConfig.refresh || (1 * 24 * 60 * 60); // 1 day by default if not specified

        if (lastFetched.add(refreshDelaySec, "seconds").isBefore(now)) {
            // Right time to refresh
            await this.refreshPluginContent(widgetState, true);
        }
    } */

    /**
     * Adds / updates a plugin widget just fetched to the list of available widgets for the choose.
     * This way, user is able to add this plugin again later to the UI without scanning the plugin
     * qr code or pasting its url.
     */
    /* public async saveDAppPluginAsAvailableWidget(widgetState: WidgetState): Promise<void> {
        let list = await this.loadCustomPluginsList();
        list[widgetState.plugin.url] = widgetState;
        await this.saveCustomPluginsList(list);

        this.onAvailableCustomPluginsListChanged.next();
    } */

    public async removeDAppPluginFromAvailableWidgets(widgetState: WidgetState): Promise<void> {
        this.state.sources = this.state.sources.filter(source => source.url !== widgetState.plugin.url)
        await this.savePluginsState(this.state);
        this.onAvailableCustomPluginsListChanged.next();
    }

    /* public async loadCustomPluginsList(): Promise<CustomWidgetsList> {
        const key = "custom-plugin-widgets";
        let list = <CustomWidgetsList>await this.globalStorageService.getSetting(DIDSessionsStore.signedInDIDString, "widgets", key, {});
        return list;
    }

    private async saveCustomPluginsList(list: CustomWidgetsList): Promise<void> {
        const key = "custom-plugin-widgets";
        await this.globalStorageService.setSetting(DIDSessionsStore.signedInDIDString, "widgets", key, list);
    } */
}