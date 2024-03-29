import { BehaviorSubject } from "rxjs";
import type { WidgetHolderComponent } from "./widget-holder/widget-holder.component";
import type { WidgetState } from "./widgetstate";

export class WidgetBase {
  public widgetState: WidgetState = null;

  private alreadyNotifiedReadyToDisplay = false; // Make sure to notify ready to display only once to avoid unnecessary work from the launcher home
  public onReadyToDisplay = new BehaviorSubject<boolean>(false);
  public forSelection: boolean; // Widget is created for selection, not for real use. It can adjust some displays accordingly for simple preview.

  public attachWidgetState(widgetState: WidgetState) {
    this.widgetState = widgetState;
  }

  attachHolder?(holder: WidgetHolderComponent);

  /**
   * Every widget has to call this method once to notify when it's ready to display.
   * Only at the time the global container spinner will hive and display all the widgets at once.
   */
  protected notifyReadyToDisplay() {
    if (this.alreadyNotifiedReadyToDisplay)
      return;

    this.onReadyToDisplay.next(true);
    this.alreadyNotifiedReadyToDisplay = true;
  }
}
