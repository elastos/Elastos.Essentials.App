import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { AppTheme, ThemeService } from '../../services/theme.service';

/**
   * Type of activity indicators that the title bar can display.
   * Activity indicators are icon animations showing that something is currently busy.
   */
export enum TitleBarActivityType {
  /** There is an on going download. */
  DOWNLOAD = 0,
  /** There is an on going upload. */
  UPLOAD = 1,
  /** There is on going application launch. */
  LAUNCH = 2,
  /** There is another on going operation of an indeterminate type. */
  OTHER = 3
}

/**
 * Color mode for all icons and texts on the title bar.
 */
export enum TitleBarForegroundMode {
  /** Title bar title and icons use a light (white) color. Use this on a dark background color. */
  LIGHT = 0,
  /** Title bar title and icons use a dark (dark gray) color. Use this on a light background color. */
  DARK = 1
}

/**
 * Sets the overall title bar display style and behavior. This API is to be used only by the launcher app. Other apps
 * can't access it, and behave as the DEFAULT mode.
 * In DESKTOP mode, the title bar shows different icons specifically for the launcher's main screen.
 */
export enum TitleBarBehavior {
  /** The title bar can be configured by apps: back/close icons, menus, app-specific icons. */
  DEFAULT = 0,
  /** The title bar displays icons for notifications, running apps, scanner and settings */
  DESKTOP = 1
}

/**
 * Status for the top left icon that can switch from one mode to another.
 */
export enum TitleBarNavigationMode {
  /** Home icon - minimizes the currently active app and returns to launcher. */
  HOME = 0,
  /** Close icon - closes the currently active app and returns to the launcher. */
  CLOSE = 1
}

/**
 * Built-in convenience icons that can be used as icon paths instead fo providing a custom icon path.
 */
export enum BuiltInIcon {
  /** Go back */
  BACK = "back",
  /** Close cross */
  CLOSE = "close",
  /** Scan a QR code */
  SCAN = "scan",
  /** Plus / Add */
  ADD = "add",
  /** Bin / Delete */
  DELETE = "delete",
  /** Settings wheel */
  SETTINGS = "settings",
  /** Help bubble */
  HELP = "help",
  /** Horizontal "3 dots" */
  HORIZONTAL_MENU = "horizontal_menu",
  /** Vertical "3 dots" */
  VERTICAL_MENU = "vertical_menu",
  /** Edit, a pen */
  EDIT = "edit",
  /** Favorite, a bookmark */
  FAVORITE = "favorite"
}

/**
 * Type used to configure icons on the title bar, with their respective actions.
 * An icon "configuration" is made of an icon picture (custom, or predefined), and
 * a unique key (to identify the action when clicked).
 */
export type TitleBarIcon = {
  /** Unique key to identify each item. */
  key: String,
  /**
   * Path to an icon picture illustrating this menu item. Path can be either a built-in value to use
   * built-in icons, or a path to a custom icon (ex: "assets/...")
   */
  iconPath: String | BuiltInIcon
}

/**
 * Type describing a context menu entry opened from the title bar. This is a standard icon type, with
 * an additional title.
 */
export type TitleBarMenuItem = TitleBarIcon & {
  /** Localized menu item display title. */
  title: String
}

export const enum TitleBarDisplayMode {
  /** The title bar is visible and large (default mode). */
  DEFAULT = 0,
  /** The title bar is visible but small, to save space for possibly an in-app sub-bar. */
  SMALL = 1,
  /** The title bar is totally hidden and the space is given back to main app content (restricted to some apps). */
  HIDDEN = 2
}

/**
 * Title bar organization:
 * | Navigation icon or outer_left | inner_left | Title | inner_right | outer_right or menu |
 */
export const enum TitleBarIconSlot {
  /** Icon on title bar's left edge. */
  OUTER_LEFT = 0,
  /** Icon between the outer left icon and the title. */
  INNER_LEFT = 1,
  /** Icon between the title and the outer right icon. */
  INNER_RIGHT = 2,
  /** Icon on title bar's right edge. */
  OUTER_RIGHT = 3
}

/**
 * elastOS's internal title bar visibility state.
 */
export const enum TitleBarVisibility {
  /** The internal title bar is visible (default) */
  VISIBLE = 0,
  /** The internal title bar is totally hidden. */
  HIDDEN = 1
}

/**
 * Native OS status bar visibility state.
 */
export const enum NativeStatusBarVisibility {
  /** The native platform status bar is visible (default) */
  VISIBLE = 0,
  /** The native platform status bar is totally hidden (elastOS is over it). */
  HIDDEN = 1
}

@Component({
  selector: 'app-titlebar',
  templateUrl: './titlebar.component.html',
  styleUrls: ['./titlebar.component.scss'],
})
export class TitleBarComponent implements OnInit {

  @Input('title') title: any;
  @Input('outerLeftIcon') outerLeftIcon: any;
  @Input('innerLeftIcon') innerLeftIcon: any;
  @Input('innerRightIcon') innerRightIcon: any;
  @Input('outerRightIcon') outerRightIcon: any;

  // TODO @chad - change this - use only one listener like in current title bar plugin interface
  @Output() outerLeftIconClicked: EventEmitter<any> = new EventEmitter();
  @Output() innerLeftIconClicked: EventEmitter<any> = new EventEmitter();
  @Output() innerRightIconClicked: EventEmitter<any> = new EventEmitter();
  @Output() outerRightIconClicked: EventEmitter<any> = new EventEmitter();

  constructor(
    public theme: ThemeService,
  ) {
    theme.activeTheme.subscribe((activeTheme) => {
      this.setTitleBarTheme(activeTheme);
    })
  }

  ngOnInit() { }

  // TODO @chad: rework these callbacks
  onOuterLeftIcon() {
    this.outerLeftIconClicked.emit();
  }
  onInnerLeftIcon() {
    this.innerLeftIconClicked.emit();
  }
  onInnerRightIcon() {
    this.innerRightIconClicked.emit();
  }
  onOuterRightIcon() {
    this.outerRightIconClicked.emit();
  }

  /**
   * Sets the main title bar title information. Pass null to clear the previous title.
   * Apps are responsible for managing this title from their internal screens.
   *
   * @param title Main title to show on the title bar. If title is not provided, the title bar shows the default title (the app name)
   */
  public setTitle(title?: String) {
    // TODO
  }

  /**
   * Sets the status bar background color.
   *
   * @param hexColor Hex color code with format "#RRGGBB"
   */
  public setBackgroundColor(hexColor: String) {
    // TODO
  }

  /**
   * Sets the title bar foreground (title, icons) color. Use this API in coordination with
   * setBackgroundColor() in order to adjust foreground with background.
   *
   * @param foregroundMode A @TitleBarForegroundMode mode, LIGHT or DARK.
   */
  public setForegroundMode(foregroundMode: TitleBarForegroundMode) {
    // TODO
  }

  /**
   * Changes the top left icon appearance and behaviour. See @TitleBarNavigationMode for available
   * navigation modes.
   *
   * @param navigationMode See @TitleBarNavigationMode
   */
  public setNavigationMode(navigationMode: TitleBarNavigationMode) {
    // TODO
  }

  /**
   * Shows or hide the top left navigation icon. That navigation icon is controlled by the runtime,
   * not by the application, so that users can always minimize or exit the application.
   *
   * This API is protected and usable only by some privileged apps. Other apps are not allowed to
   * hide the navigation icon.
   *
   * @param visible Whether to show the navigation icon or not.
   */
  public setNavigationIconVisibility(visible: boolean) {
    // TODO
  }

  /**
   * Adds a listener to be notified when an icon is clicked. This works for both flat icons
   * (setIcon()) and menu items (setupMenuItems()). Use the icon "key" field to know which
   * icon was clicked.
   *
   * @param onItemClicked Callback called when an item is clicked.
   */
  public addOnItemClickedListener(onItemClicked: (icon: TitleBarIcon | TitleBarMenuItem) => void) {
    // TODO
  }

  /**
   * Remove a listener.
   *
   * @param onItemClicked Callback called when an item is clicked.
   */
  public removeOnItemClickedListener(onItemClicked: (icon: TitleBarIcon | TitleBarMenuItem) => void) {
    // TODO
  }

  /**
   * Configures icons displayed on the left or right of the main title.
   *
   * Only some privileged apps can configure the OUTER_LEFT slot. Other slots are accessible to all apps.
   * The OUTER_LEFT icon is visible only in case the navigation icon is hidden. Otherwise, the navigation
   * icon overwrites the OUTER_LEFT icon.
   *
   * @param iconSlot Location to configure.
   * @param icon Icon and action to be used at this slot. Use null to clear any existing configuration.
   */
  public setIcon(iconSlot: TitleBarIconSlot, icon: TitleBarIcon) {
    // TODO
  }

  /**
   * Configures the menu popup that is opened when the top right menu icon is touched.
   * This menu popup mixes app-specific items (menuItems) and native system actions.
   * When a menu item is touched, the item click listener is called.
   *
   * In case this menu items is configured, it overwrites any icon configured on the OUTER_RIGHT
   * slot.
   *
   * @param menuItems List of app-specific menu entries @TitleBarMenuItem . Pass null to remove the existing menu.
   */
  public setupMenuItems(menuItems: TitleBarMenuItem[]) {
    // TODO
  }

  /**
   * Adds a badge marker on the top right of an icon slot. Used for example to shows that some
   * notifications are available, unread messages, etc.
   *
   * @param badgeSlot Location to configure.
   * @param count Number to display as a badge over the icon. A value of 0 hides the badge.
   */
  public setBadgeCount(iconSlot: TitleBarIconSlot, count: number) {
    // TODO
  }

  /**
   * Shows an indicator on the title bar to indicate that something is busy.
   * Several dApps can interact with an activity indicator at the same time. As long as there
   * is at least one dApp setting an indicator active, that indicator remains shown.
   *
   * @param type Type of activity indicator to start showing.
   * @param hintText Optional text to display during the animation.
   */
  public showActivityIndicator(type: TitleBarActivityType, hintText?: string) {
    // TODO
  }

  /**
   * Requests to hide a given activity indicator. In case other dApps are still busy using
   * this indicator, the activity indicator remains active, until the last dApp releases it.
   *
   * @param type Type of activity indicator to stop showing for the active dApp.
   */
  public hideActivityIndicator(type: TitleBarActivityType) {
    // TODO
  }

  /**
   * Toggles the visibility status of both the elastOS internal title bar, and the native system
   * status bar. Hiding both bars makes the application become fullscreen.
   *
   * Note that calling this API requires a user permission in order to safely enter fullscreen mode.
   */
  public setVisibility(titleBarVisibility: TitleBarVisibility, statusBarVisibility: NativeStatusBarVisibility) {
    // TODO
  }

  /*
   * @deprecated
   *
   * Changes the overall behavior of the title bar.
   *
   * Accessible only by the launcher app. Other apps use the DEFAULT behavior.
   *
   * @param behavior A @TitleBarBehavior behavior to globally configure the title bar.
   */
  public setBehavior(behavior: TitleBarBehavior) {
    // TODO
  }

  private setTitleBarTheme(theme: AppTheme) {
    if (theme == AppTheme.LIGHT) {
      document.body.classList.remove("dark");
      // TODO @chad: this.setForegroundMode(TitleBarPlugin.TitleBarForegroundMode.DARK);
      // TODO @chad: this.setBackgroundColor("#f8f8ff");
    } else {
      document.body.classList.add("dark");
      // TODO @chad: this.setForegroundMode(TitleBarPlugin.TitleBarForegroundMode.LIGHT);
      // TODO @chad: this.setBackgroundColor("#191a2f");
    }
  }
}
