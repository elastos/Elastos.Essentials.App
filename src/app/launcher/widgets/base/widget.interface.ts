/**
 * Lifecycle interface to get initialized of deinitialized by the widget engine.
 * This interface works identically for widgets widget holders and widgets.
 *
 * Service manages lifecycle of holders.
 * Holders manage lifecycle of widgets.
 */
export interface WidgetLifeCycle {
  //onWidgetInit?(): Promise<void>;
  //onWidgetDeinit?(): Promise<void>;
}
export interface Widget extends WidgetLifeCycle {
  forSelection: boolean; // Widget is created for selection, not for real use. It can adjust some displays accordingly for simple preview.
}
