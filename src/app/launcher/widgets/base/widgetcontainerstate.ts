export type BuiltInWidgetType =
  "identity" |
  "active-wallet"; // TODO: others

export type WidgetState = {
  category: "builtin" | "app-plugin"; // builtin: fully custom Essentials widget. "app-plugin": template based plugin widget for external dApps.
  builtInType: BuiltInWidgetType;
}

export type WidgetContainerState = {
  // List of widgets shown in this container, in display order
  widgets: WidgetState[];
}