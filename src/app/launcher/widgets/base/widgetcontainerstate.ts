export type BuiltInWidgetType =
  "identity" |
  "active-wallet" |
  "signout" |
  "elastos-voting" |
  "recent-apps" |
  "backup-identity" |
  "wallet-connect" |
  "new-red-packets" |
  "easy-bridge" |
  "contacts" |
  "red-packets" |
  "hive";

export type WidgetState = {
  id?: string; // Unique widget ID generated when first created. Used to uniquely identity (eg deletions) this widget.
  category: "builtin" | "app-plugin"; // builtin: fully custom Essentials widget. "app-plugin": template based plugin widget for external dApps.
  builtInType: BuiltInWidgetType;
}

export type WidgetContainerState = {
  // List of widgets shown in this container, in display order
  widgets: WidgetState[];
}