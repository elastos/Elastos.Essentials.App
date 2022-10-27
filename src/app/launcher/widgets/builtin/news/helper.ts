import { NewsContent, NewsContentItem, PluginConfig } from "../../base/pluginconfig";
import { FeedsChannel } from "../../services/feedsnews.service";
import { NewsSource } from "../../services/news.service";
import { WidgetPluginsService } from "../../services/plugin.service";

const FEEDS_DEEPLINK_CHANNEL_BASEURL = 'https://feeds.trinity-feeds.app/v3channel';
const FEEDS_DEEPLINK_POST_BASEURL = 'https://feeds.trinity-feeds.app/v3post';

/**
 * Mix of raw news source config with real news content.
 */
export type DisplayableNews = {
  //source: NewsSource;
  logo: string;
  sender: string;
  //config: PluginConfig<NewsContent>; // Whole json plugin parent.
  news: NewsContentItem;
  type: "plugin" | "feeds";
}

export class NewsHelper {
  public static async prepareNews(newsSources: NewsSource[], feedsChannels: FeedsChannel[]) {
    let allNews: DisplayableNews[] = [];

    // Prepare content for each widget plugin source.
    for (let source of newsSources) {
      if (!source.enabled)
        continue; // Skip this source if disabled

      let content = <PluginConfig<NewsContent>>await WidgetPluginsService.instance.getPluginContent(source.url);

      for (let news of content.content.items) {
        let displayableNews: DisplayableNews = {
          //source,
          logo: content.logo,
          sender: content.projectname ?? "",
          news,
          type: "plugin"
        };
        allNews.push(displayableNews);
      }
    }

    // Prepare content for each feeds channel post
    for (let channel of feedsChannels) {
      if (!channel.enabled)
        continue; // Skip this channel if disabled

      for (let post of channel.recentPosts) {
        let displayableNews: DisplayableNews = {
          //source,
          logo: channel.avatar,
          sender: channel.name,
          news: {
            title: null, // No posts titles in feeds
            info: post.message,
            timevalue: post.timestamp,
            action: NewsHelper.getFeedsPostDeepLink(channel.ownerDID, channel.id, post.id),
            picture: post.mediaPicture
          },
          type: "feeds"
        };

        allNews.push(displayableNews);
      }
    }

    // Sort all collected news by date
    allNews.sort((a, b) => b.news.timevalue - a.news.timevalue);

    return allNews;
  }

  public static getFeedsPostDeepLink(channelOwnerUserDid: string, channelId: string, postId: string): string {
    return FEEDS_DEEPLINK_POST_BASEURL
      + "/?targetDid=" + encodeURIComponent(channelOwnerUserDid)
      + "&channelId=" + encodeURIComponent(channelId)
      + "&postId=" + encodeURIComponent(postId);
  }
}