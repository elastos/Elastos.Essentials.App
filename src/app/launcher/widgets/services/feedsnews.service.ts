import { Injectable } from '@angular/core';
import type { ChannelInfo, PostBody, RuntimeContext } from '@feedsnetwork/feeds-js-sdk';
import moment from 'moment';
import { BehaviorSubject } from 'rxjs';
import { GlobalConfig } from 'src/app/config/globalconfig';
import { lazyFeedsSDKImport } from 'src/app/helpers/import.helper';
import { compressImage, transparentPixelIconDataUrl } from 'src/app/helpers/picture.helpers';
import { runDelayed } from 'src/app/helpers/sleep.helper';
import { Logger } from 'src/app/logger';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { WidgetPluginsService } from './plugin.service';

const PERSISTENCE_CONTEXT = "launcher-widget-feeds-news";

const MIN_CHANNEL_REFRESH_DELAY_SECS = (1 * 24 * 60 * 60); // 1 day

export type FeedsNewsPost = {
    id: string;
    timestamp: number; // Time value of this post (for ordering)
    title: string;
    message: string; // Epurated version of the real feeds post (shorter, no media, etc)
    mediaPicture?: string; // If a picture media is available in the post, this is the base64 thumbnail of that media.
}

export type FeedsChannel = {
    id: string;
    avatar: string; // Small avatar picture, base64 encoded
    name: string; // Channel name - normally, the project name
    recentPosts: FeedsNewsPost[];
    ownerDID: string; // DID of the channel owner

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
        await this.loadChannels(signedInIdentity.didString);
        this.channels.next(this.channels.value);

        // Wait a moment after the boot as fetching feeds posts is a heavy process for now.
        runDelayed(() => this.fetchedSubscribedChannels(), 10000);
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
    public async fetchedSubscribedChannels(onlyExpired = true) {
        // Already fetching: don't launch 2 parrallel fetches
        if (this.fetchingChannels.value)
            return;

        let signedInUserDid = DIDSessionsStore.signedInDIDString;
        let channels: FeedsChannel[] = [];

        const { Logger: FeedsLogger, Channel, MediaType, Post } = await lazyFeedsSDKImport();
        FeedsLogger.setDefaultLevel(FeedsLogger.WARNING);

        Logger.log("feeds", "Fetching channels and posts for user:", signedInUserDid);

        this.fetchingChannels.next(true);

        let now = moment();

        const runtimeContext = await this.getRuntimeContext(signedInUserDid);
        const feedsChannels = await this.fetchSubscribedChannels(signedInUserDid);
        for (let feedsChannel of feedsChannels) {
            let lastFetched = await this.globalStorageService.getSetting(signedInUserDid, NetworkTemplateStore.networkTemplate, PERSISTENCE_CONTEXT, feedsChannel.getChannelId() + "_lastfetched", 0);
            let rightTimeToRefresh = moment.unix(lastFetched).add(MIN_CHANNEL_REFRESH_DELAY_SECS, "seconds").isSameOrBefore(lastFetched);
            if (!rightTimeToRefresh && onlyExpired) {
                // If not a right time to refresh, and not forced to refresh, reuse what we have in cache
                let channel = this.getChannelById(feedsChannel.getChannelId());
                if (channel) { // Make sure we really have it in cache
                    channels.push(channel);
                    continue;
                }
                // else: not found in cache, fetch it below
            }

            const feedsPosts = await this.fetchedChannelPosts(signedInUserDid, feedsChannel);

            let avatarBase64: string;
            try {
                const channelObject = new Channel(runtimeContext, feedsChannel);

                // Feeds avatar pictures are directly encoded as "data:image/png;base64,..."
                const rawAvatarData = await channelObject.downloadChannelAvatarByUrl(feedsChannel.getAvatar()); // Based64 picture Buffer
                avatarBase64 = rawAvatarData.toString();

                // Resize, as feeds pictures are huge
                if (avatarBase64) {
                    avatarBase64 = await compressImage(avatarBase64, 128);
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
                ownerDID: feedsChannel.getOwnerDid(),
                enabled: true
            }
            channels.push(channel);

            for (let feedsPost of feedsPosts) {
                let post: FeedsNewsPost = {
                    id: feedsPost.getPostId(),
                    timestamp: feedsPost.getCreatedAt() / 1000,
                    title: channel.name, // Use channel name as news title as we don't have titles in feeds
                    message: feedsPost.getContent().getContent()
                }

                // Fetch a media preview, if any
                let mediaData = feedsPost.getContent().getMediaData()
                if (mediaData.length > 0) {
                    if (feedsPost.getContent().getMediaType() == MediaType.containsImg) {
                        let thumbnail = feedsPost.getContent().getMediaData()[0].getThumbnailPath()

                        try {
                            let postObj = new Post(runtimeContext, feedsPost);
                            let media = await postObj.downloadMediaByHiveUrl(thumbnail);
                            if (media) {
                                let mediaBase64 = media.toString();

                                // Resize, as feeds pictures can be large
                                if (mediaBase64) {
                                    mediaBase64 = await compressImage(mediaBase64, 128);
                                }
                                else {
                                    mediaBase64 = null;
                                }

                                post.mediaPicture = mediaBase64;
                            }
                        }
                        catch (e) {
                            Logger.warn("feeds", "Failed to download / handle post media", e);
                        }
                    }
                }

                channel.recentPosts.push(post);
            }

            await this.globalStorageService.setSetting(signedInUserDid, NetworkTemplateStore.networkTemplate, PERSISTENCE_CONTEXT, feedsChannel.getChannelId() + "_lastfetched", now.unix());
        }

        // Update incoming channels enabled state with state in cache
        for (let channel of channels) {
            let existingChannel = this.getChannelById(channel.id, channels);
            if (existingChannel)
                channel.enabled = existingChannel.enabled;
        }

        // Save to disk
        await this.saveChannels(signedInUserDid, channels);

        // Make sure to update data / send rx events only if we haven't changed the
        // signed in DID while fetching feeds content, which takes a while.
        if (DIDSessionsStore.signedInDIDString === signedInUserDid) {
            this.fetchingChannels.next(false);
            this.channels.next(channels);
        }
    }

    private async getRuntimeContext(signedInUserDid: string): Promise<RuntimeContext> {
        const { RuntimeContext } = await lazyFeedsSDKImport();
        if (!RuntimeContext.isInitialized()) {
            let provider = await this.globalHiveService.getRawHiveContextProvider(GlobalConfig.FEEDS_APP_DID, signedInUserDid);
            let didResolverUrl = GlobalElastosAPIService.instance.getApiUrl(ElastosApiUrlType.EID_RPC);
            RuntimeContext.createInstance(provider, signedInUserDid, didResolverUrl);
        }

        return RuntimeContext.getInstance();
    }

    /**
     * Fetches all active user subscriptions to feeds channels.
     */
    private async fetchSubscribedChannels(signedInUserDid: string): Promise<ChannelInfo[]> {
        const { MyProfile } = await lazyFeedsSDKImport();

        const runtimeContext = await this.getRuntimeContext(signedInUserDid);
        const myprofile = new MyProfile(runtimeContext, signedInUserDid, null);

        try {
            const channels = await myprofile.querySubscribedChannels(null, null);
            return channels;
        }
        catch (e) {
            // Possibly, not a feeds user
            Logger.warn("feeds", "Failed to retrieve channels", e);
            return [];
        }
    }

    private async fetchedChannelPosts(signedInUserDid: string, channelInfo: ChannelInfo): Promise<PostBody[]> {
        try {
            const { Channel } = await lazyFeedsSDKImport();

            const runtimeContext = await this.getRuntimeContext(signedInUserDid);
            const channel = new Channel(runtimeContext, channelInfo);
            const postBodys = await channel.queryPosts(0, new Date().getTime(), null); // Gets the latest 30 posts - third param "capacity" is useless for now, arbitrary null used.

            // 0 (available) and 2 (edited) OK - 1 (deleted) filtered out.
            return postBodys.filter(post => post.getStatus() != 1).slice(0, 1); // Max 1 recent news per source to not be flooded
        }
        catch (e) {
            Logger.error("FEEDS", "FEEDS", e);
            return [];
        }
    }

    public getChannelById(channelId: string, searchedChannels = this.channels.value): FeedsChannel {
        return searchedChannels.find(c => c.id === channelId);
    }

    public async setChannelEnabled(channelId: string, enabled: boolean) {
        let channel = this.getChannelById(channelId);
        if (channel) {
            channel.enabled = enabled;
            await this.saveChannels(DIDSessionsStore.signedInDIDString, this.channels.value);
            this.channels.next(this.channels.value);
        }
    }

    private async saveChannels(signedInUserDid: string, channels: FeedsChannel[]): Promise<void> {
        const key = "widget-feeds-channels";
        await this.globalStorageService.setSetting(signedInUserDid, NetworkTemplateStore.networkTemplate, PERSISTENCE_CONTEXT, key, channels);
    }

    private async loadChannels(signedInUserDid: string): Promise<void> {
        const key = "widget-feeds-channels";
        const sources = await this.globalStorageService.getSetting(signedInUserDid, NetworkTemplateStore.networkTemplate, PERSISTENCE_CONTEXT, key, []);
        this.channels.next(sources);
    }
}