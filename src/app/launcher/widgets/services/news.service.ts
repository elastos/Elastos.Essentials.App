import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NewsContent, PluginConfig } from '../base/pluginconfig';
import { WidgetPluginsService } from './plugin.service';

const PERSISTENCE_CONTEXT = "launcher-widget-news";

export type NewsSource = {
    name: string; // Source name - normally, the project name
    url: string; // dApp JSON plugin url (that we use as news source, not within a plugin template)
    enabled: boolean; // Whether to update and show this source on the news widget or not. Users can disable a news display without deleting it.
}

@Injectable({
    providedIn: 'root'
})
export class WidgetsNewsService implements GlobalService {
    public static instance: WidgetsNewsService;

    public sources = new BehaviorSubject<NewsSource[]>([]);

    constructor(
        private globalStorageService: GlobalStorageService,
        private widgetPluginsService: WidgetPluginsService
    ) {
        WidgetsNewsService.instance = this;
        GlobalServiceManager.getInstance().registerService(this);
    }

    async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        await this.loadNewsSources();
        this.sources.next(this.sources.value);

        console.log("NEWS SOURCES", this.sources.value);
    }

    onUserSignOut(): Promise<void> {
        this.sources.next([]);
        return;
    }

    /**
     * Returns the list of all news source urls (enabled or not)
     */
    public getNewsSourceURLs(onlyEnabled = true) {
        return this.sources.value.filter(s => onlyEnabled ? s.enabled : true).map(s => s.url);
    }

    /**
     * If not existing yet, adds a widget url as part of news sources for news widgets.
     *
     * NOTE: The url must be a valid news source
     */
    public async upsertNewsSource(url: string, name: string, pluginContent: PluginConfig<NewsContent>) {
        let sources = this.sources.value;
        let existingSource = this.getSourceByUrl(url);
        if (!existingSource) {
            // No source yet, create one
            existingSource = {
                name,
                url,
                enabled: true
            }
            sources.push(existingSource);
        }

        // Update the name to the latest value
        existingSource.name = name;

        await this.saveNewsSources(sources);
        this.sources.next(sources);
    }

    /**
     * Make sure some plugin content have not been modified by the project to become a NON news source.
     * In which case we remove the source automatically.
     */
    public async checkNewsSources() {
        let sources = this.sources.value;
        let newSources: NewsSource[] = [];
        for (let source of sources) {
            let content = await this.widgetPluginsService.getPluginContent(source.url);
            if (content.contenttype === "news")
                newSources.push(source);
        }

        await this.saveNewsSources(newSources);
        this.sources.next(newSources);
    }

    public async removeNewsSource(url: string) {
        let sources = this.sources.value;
        // Delete the source
        sources = sources.filter(s => s.url != url);

        await this.saveNewsSources(sources);
        this.sources.next(sources);
    }

    public async setNewsSourceEnabled(url: string, enabled: boolean) {
        let source = this.getSourceByUrl(url);
        if (source) {
            source.enabled = enabled;
            await this.saveNewsSources(this.sources.value);
            this.sources.next(this.sources.value);
        }
    }

    private getSourceByUrl(url: string): NewsSource {
        return this.sources.value.find(s => s.url === url);
    }

    /**
     * Loads widget container state from disk. i.e. list of widgets it contains.
     */
    /* public async loadContainerState(widgetContainerName: string): Promise<WidgetContainerState> {
        const key = "widget-container-state-" + widgetContainerName;
        let state = <WidgetContainerState>await this.globalStorageService.getSetting(DIDSessionsStore.signedInDIDString, PERSISTENCE_CONTEXT, key, null);

        if (!state) {
            // Generate and save a default configuration for the default container layout, if this is a well known default container name
            state = await this.generateDefaultContainerState(widgetContainerName);
        }

        return state;
    } */

    private async saveNewsSources(sources: NewsSource[]): Promise<void> {
        const key = "widget-news-sources";
        await this.globalStorageService.setSetting(DIDSessionsStore.signedInDIDString, PERSISTENCE_CONTEXT, key, sources);
    }

    private async loadNewsSources(): Promise<void> {
        const key = "widget-news-sources";
        const sources = await this.globalStorageService.getSetting(DIDSessionsStore.signedInDIDString, PERSISTENCE_CONTEXT, key, []);
        this.sources.next(sources);
    }
}