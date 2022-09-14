
export type BuiltInWidgetType =
  "identity" |
  "active-wallet" |
  "signout" |
  "elastos-voting" |
  "recent-apps" |
  "backup-identity" |
  "hive-sync" |
  "wallet-connect" |
  "new-red-packets" |
  "easy-bridge" |
  "contacts" |
  "red-packets" |
  "hive" |
  "discover-dapps" |
  "active-network-coin-price" |
  "choose-active-network" |
  "notifications";

export enum DisplayCategories {
  ELASTOS = "elastos",
  BROWSER = "browser",
  FINANCE = "finance",
  IDENTITY = "identity",
  COMMUNITY = "community",
  DAPPS = "dapps"
}

export type PluginType = "standard" | "news";

export type WidgetState = {
  id?: string; // Unique widget ID generated when first created. Used to uniquely identity (eg deletions) this widget.
  category: "builtin" | "app-plugin"; // builtin: fully custom Essentials widget. "app-plugin": template based plugin widget for external dApps.
  displayCategories: DisplayCategories[];

  // For built=in widgets
  builtInType?: BuiltInWidgetType;

  // Extended widget state for plugin widgets from external dApps.
  plugin?: {
    url?: string; // JSON content remote address, where we can refresh the content. For all plugin widgets except the news plugin.
    pluginType: PluginType; // Special annotation to remember the widget type, which is special for news widgets (one widget, multiple widget sources)
    //json?: JSONObject; // Fetched content from the url, validated as JSON. Cache.
  }
}

export type WidgetContainerState = {
  // List of widgets shown in this container, in display order
  widgets: WidgetState[];
}