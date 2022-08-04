
type RefreshOn = "networkchange";
type GalleryContentItem = {
  title?: string; // "Super monkey"
  picture: string; // url or base64
  info?: string; // "23 ELA",
  actions?: [ // List of small action icons
    {
      icon: string; // url or base64
      url: string; // "url to open when clicking the action button"
    }
  ]
};

type GalleryContent = {
  //"columns": 2, // Number of item columns
  autoscroll?: 10; // Number of seconds between slide scrolls, if the number of items is larger than what can be displayed
  items: GalleryContentItem[];
}

type PortalContentItem = {
  title: string; // Button title
  icon?: string; // Optional url or base64
  url: string; // Action to call when the button is clicked
};

export type PortalContent = {
  header: string; // Simple visual string on top of the items
  items: PortalContentItem[];
};

export type NewsContentItem = {
  title: string;
  info: string;
  icon: string; // url or base64
  // badge: number; // later - replace the icon with a badge count (number of unread emails, etc)
  action: { // Action button below the info
    title: string,
    url: string;
  }
}

export type NewsContent = {
  items: NewsContentItem[];
}

type ContentType = "portal" | "gallery" | "news";

export type PluginConfig<T> = {
  logo: string; // url or base64 of the dapp
  sublogo?: string; // Optional url or base64 to distinguish the context for users, in case dapps have multiple widgets
  url?: string; // Optional url opened when the project logo is touched - normally, the main dapp url
  refresh?: number; // Number of seconds between new calls to the widget url to refresh content - eg: 120. Default: refresh only when restarting
  refreshon?: RefreshOn[]; // List of events that trigger a new api call to refresh content, in addition to the standard timed refresh
  contenttype: ContentType; // Specifies the format of items in the "content" list below
  content: T;
}