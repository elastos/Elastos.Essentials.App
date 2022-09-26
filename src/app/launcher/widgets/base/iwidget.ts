import { WidgetHolderComponent } from "./widget-holder/widget-holder.component";
import { WidgetState } from "./widgetstate";

export interface IWidget {
  forSelection: boolean; // Widget is created for selection, not for real use. It can adjust some displays accordingly for simple preview.

  attachWidgetState?(widgetState: WidgetState);
  attachHolder?(holder: WidgetHolderComponent);
}
