import { JSONObject } from "src/app/model/json";

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
  "choose-active-network";

export enum DisplayCategories {
  ELASTOS = "elastos",
  BROWSER = "browser",
  FINANCE = "finance",
  IDENTITY = "identity",
  COMMUNITY = "community",
  DAPPS = "dapps"
}

export type WidgetState = {
  id?: string; // Unique widget ID generated when first created. Used to uniquely identity (eg deletions) this widget.
  category: "builtin" | "app-plugin"; // builtin: fully custom Essentials widget. "app-plugin": template based plugin widget for external dApps.
  displayCategories: DisplayCategories[];

  // For built=in widgets
  builtInType?: BuiltInWidgetType;

  // Extended widget state for plugin widgets from external dApps.
  plugin?: {
    url?: string; // JSON content remote address, where we can refresh the content
    json?: JSONObject; // Fetched content from the url, validated as JSON. Cache.
    lastFetched: number; // Timestamp at which the JSON content was last fetched. So we know when to refresh it.
  }
}

export type WidgetContainerState = {
  // List of widgets shown in this container, in display order
  widgets: WidgetState[];
}