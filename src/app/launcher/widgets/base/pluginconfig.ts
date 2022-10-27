
export enum RefreshOn {
  NETWORK_CHANGE = "networkchange"
}

type GalleryContentItem = {
  title?: string; // "Super monkey"
  picture: string; // url or base64
  subinfo?: string; // "23 ELA",
  url?: string; // url to open when clicking the action button
};

export type GalleryContent = {
  items: GalleryContentItem[];
}

type PortalContentItem = {
  title: string; // Button title
  icon?: string; // Optional url or base64
  url: string; // Action to call when the button is clicked
};

export type PortalContent = {
  items: PortalContentItem[];
};

export type NewsContentItem = {
  title: string;
  info: string;
  timevalue: number; // unix timestamp (secs) used to order news by date
  action: string; // url opened when clicking the news
  picture?: string; // Base64 illustration, if any
}

export type NewsContent = {
  items: NewsContentItem[];
}

export type TokenPriceToken = {
  icon?: string;
  symbol: string; // eg "Glide",
  network?: string; // eg "Elastos Smart Chain",
  url?: string; // Token page url, if any
  priceusd: number; // eg 0.056,
  volume24husd?: number; // eg 104562,
  change24hpercent?: number; // eg 4.86
};

export type TokenPriceContent = {
  token: TokenPriceToken;
}

type ContentType = "portal" | "gallery" | "news" | "tokenprice";

export type PluginConfig<T> = {
  logo: string; // url or base64 of the dapp
  projectname: string; // Short project name, displayed on most widgets
  title?: string; // Short title to describe the widget
  url?: string; // Optional url opened when the project logo is touched - normally, the main dapp url
  refresh?: number; // Number of seconds between new calls to the widget url to refresh content - eg: 120. Default: 1 day. Min: 30 seconds
  refreshon?: RefreshOn[]; // List of events that trigger a new api call to refresh content, in addition to the standard timed refresh
  contenttype: ContentType; // Specifies the format of items in the "content" list below
  content: T;
}