import { Injectable } from '@angular/core';
import { Logger as Hivelogger } from "@elastosfoundation/hive-js-sdk";
import { Channel, ChannelInfo, Logger as FeedsLogger, MyProfile, PostBody, RuntimeContext } from 'feeds-experiment';
import moment from 'moment';
import { BehaviorSubject } from 'rxjs';
import { GlobalConfig } from 'src/app/config/globalconfig';
import { compressImage, transparentPixelIconDataUrl } from 'src/app/helpers/picture.helpers';
import { runDelayed } from 'src/app/helpers/sleep.helper';
import { Logger } from 'src/app/logger';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { WidgetPluginsService } from './plugin.service';

const PERSISTENCE_CONTEXT = "launcher-widget-feeds-news";

const MIN_CHANNEL_REFRESH_DELAY_SECS = (1 * 24 * 60 * 60); // 1 day

export type FeedsNewsPost = {
    timestamp: number; // Time value of this post (for ordering)
    title: string;
    message: string; // Epurated version of the real feeds post (shorter, no media, etc)
}

export type FeedsChannel = {
    id: string;
    avatar: string; // Small avatar picture, base64 encoded
    name: string; // Channel name - normally, the project name
    recentPosts: FeedsNewsPost[];

    enabled: boolean; // Whether to update and show this source on the news widget or not. Users can disable a news display without deleting it.
}

@Injectable({
    providedIn: 'root'
})
export class WidgetsFeedsNewsService implements GlobalService {
    public static instance: WidgetsFeedsNewsService;

    public channels = new BehaviorSubject<FeedsChannel[]>([]);
    public fetchingChannels = new BehaviorSubject<boolean>(false);

    constructor(
        private globalStorageService: GlobalStorageService,
        private globalHiveService: GlobalHiveService,
        private widgetPluginsService: WidgetPluginsService
    ) {
        WidgetsFeedsNewsService.instance = this;
        GlobalServiceManager.getInstance().registerService(this);
    }

    async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        await this.loadChannels();
        this.channels.next(this.channels.value);

        // Wait a moment after the boot as fetching feeds posts is a heavy process for now.
        runDelayed(() => this.fetchedSubscribedChannels(true), 10000);
    }

    onUserSignOut(): Promise<void> {
        this.channels.next([]);
        return;
    }

    /**
     * Fetched the latest info about subscribed feeds channels by the active user, and their recent posts.
     * Those channels have been subscribed from the Feeds app.
     *
     * Fetched channels and posts are stored locally and made ready to display by the news widget.
     */
    private async fetchedSubscribedChannels(onlyExpired = false) {
        // Already fetching: don't launch 2 parrallel fetches
        if (this.fetchingChannels.value)
            return;

        let channels: FeedsChannel[] = [];

        FeedsLogger.setDefaultLevel(FeedsLogger.WARNING);
        Hivelogger.setDefaultLevel(Hivelogger.WARNING);

        Logger.log("feeds", "Fetching channels and posts");

        this.fetchingChannels.next(true);

        let now = moment();

        const runtimeContext = await this.getRuntimeContext();
        const feedsChannels = await this.fetchSubscribedChannels();
        for (let feedsChannel of feedsChannels) {
            let lastFetched = await this.globalStorageService.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, PERSISTENCE_CONTEXT, feedsChannel.getChannelId() + "_lastfetched", 0);
            if (!now.subtract(MIN_CHANNEL_REFRESH_DELAY_SECS, "seconds").isSameOrAfter(lastFetched)) {
                // Not a right time to refresh, reuse what we have in cache
                let channel = this.getChannelById(feedsChannel.getChannelId());
                if (channel) { // Make sure we really have it in cache
                    channels.push(channel);
                    continue;
                }
                // else: not found in cache, fetch it below
            }

            const feedsPosts = await this.fetchedChannelPosts(feedsChannel);

            let avatarBase64: string;
            try {
                const channelObject = new Channel(runtimeContext, feedsChannel);

                // Feeds avatar pictures are directly encoded as "data:image/png;base64,..."
                const rawAvatarData = await channelObject.downloadChannelAvatarByUrl(feedsChannel.getAvatar()); // Based64 picture Buffer
                avatarBase64 = rawAvatarData.toString();

                // Resize, as feeds pictures are huge
                if (avatarBase64) {
                    console.log("avatar before", feedsChannel.getChannelId(), avatarBase64)
                    avatarBase64 = await compressImage(avatarBase64, 128);
                    console.log("avatar after", feedsChannel.getChannelId(), avatarBase64)
                }
                else {
                    avatarBase64 = transparentPixelIconDataUrl();
                }
            }
            catch (e) {
                Logger.warn("feeds", "Failed to fetch channel avatar", e);
                avatarBase64 = transparentPixelIconDataUrl();
            }

            let channel: FeedsChannel = {
                id: feedsChannel.getChannelId(),
                avatar: avatarBase64,
                name: feedsChannel.getDisplayName() ?? feedsChannel.getName(),
                recentPosts: [],
                enabled: true
            }
            channels.push(channel);

            for (let feedsPost of feedsPosts) {
                let post: FeedsNewsPost = {
                    timestamp: feedsPost.getCreatedAt() / 1000,
                    title: channel.name, // Use channel name as news title as we don't have titles in feeds
                    message: feedsPost.getContent().getContent()
                }
                channel.recentPosts.push(post);
            }

            await this.globalStorageService.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, PERSISTENCE_CONTEXT, feedsChannel.getChannelId() + "_lastfetched", now.unix());
        }

        // Update incoming channels enabled state with state in cache
        for (let channel of channels) {
            let existingChannel = this.getChannelById(channel.id);
            if (existingChannel)
                channel.enabled = existingChannel.enabled;
        }

        // Save to disk
        await this.saveChannels(channels);

        this.fetchingChannels.next(false);
        this.channels.next(channels);
    }

    private async getRuntimeContext(): Promise<RuntimeContext> {
        const userDid = DIDSessionsStore.signedInDIDString;
        if (!RuntimeContext.isInitialized()) {
            let provider = await this.globalHiveService.getRawHiveContextProvider(GlobalConfig.FEEDS_APP_DID, userDid);
            RuntimeContext.createInstance(provider, "mainnet", userDid)
        }

        return RuntimeContext.getInstance();
    }

    /**
     * Fetches all active user subscriptions to feeds channels.
     */
    private async fetchSubscribedChannels(): Promise<ChannelInfo[]> {
        const userDid = DIDSessionsStore.signedInDIDString;
        const runtimeContext = await this.getRuntimeContext();
        const myprofile = new MyProfile(runtimeContext, userDid, null, null);

        try {
            const channels = myprofile.querySubscriptions();
            return channels;
        }
        catch (e) {
            Logger.warn("feeds", "Failed to retrieve channels", []);
            return [];
        }
    }

    private async fetchedChannelPosts(channelInfo: ChannelInfo): Promise<PostBody[]> {
        try {
            const runtimeContext = await this.getRuntimeContext();
            const channel = new Channel(runtimeContext, channelInfo);
            const postBodys = await channel.queryPostsByRangeOfTime(0, new Date().getTime()); // Gets the latest 30 posts

            // 0 (available) and 2 (edited) OK - 1 (deleted) filtered out.
            return postBodys.filter(post => post.getStatus() != 1).slice(0, 1); // Max 1 recent news per source to not be flooded
        }
        catch (e) {
            Logger.error("FEEDS", "FEEDS", e);
            return [];
        }
    }

    public getChannelById(channelId: string): FeedsChannel {
        return this.channels.value.find(c => c.id === channelId);
    }

    public async setChannelEnabled(channelId: string, enabled: boolean) {
        let channel = this.getChannelById(channelId);
        if (channel) {
            channel.enabled = enabled;
            await this.saveChannels(this.channels.value);
            this.channels.next(this.channels.value);
        }
    }

    private async saveChannels(channels: FeedsChannel[]): Promise<void> {
        const key = "widget-feeds-channels";
        await this.globalStorageService.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, PERSISTENCE_CONTEXT, key, channels);
    }

    private async loadChannels(): Promise<void> {
        const key = "widget-feeds-channels";
        const sources = await this.globalStorageService.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, PERSISTENCE_CONTEXT, key, []);
        this.channels.next(sources);
    }
}