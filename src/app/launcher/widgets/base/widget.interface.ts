export interface Widget {
  forSelection: boolean; // WIdget is created for selection, not for real use. It can adjust some displays accordingly for simple preview.

  onWidgetInit?(): Promise<void>;
  onWidgetDeinit?(): Promise<void>;
}