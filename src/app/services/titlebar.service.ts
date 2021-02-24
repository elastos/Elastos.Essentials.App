import { Injectable } from '@angular/core';
import { AppTheme, ThemeService } from './theme.service';
  
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

  export type TitleBarTheme = {
    backgroundColor: string;
    color: string;
  }
  
  /**
   * Type used to configure icons on the title bar, with their respective actions.
   * An icon "configuration" is made of an icon picture (custom, or predefined), and
   * a unique key (to identify the action when clicked).
   */
  export type TitleBarIcon = {
    /** Unique key to identify each item. */
    key: string,
    /**
     * Path to an icon picture illustrating this menu item. Path can be either a built-in value to use
     * built-in icons, or a path to a custom icon (ex: "assets/...")
     */
    iconPath: String | BuiltInIcon
  }

  export type TitleBarSlotItem = TitleBarIcon & {
    visibile: boolean
    badgeCount: number
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

@Injectable({
  providedIn: 'root'
})
export class TitlebarService {

  public title: string = '';

  public visibile: boolean = true;
  public menuVisible: boolean = false;

  public theme: TitleBarTheme;

  public outerLeftIcon: TitleBarSlotItem;
  public innerLeftIcon: TitleBarSlotItem;
  public innerRightIcon: TitleBarSlotItem;
  public outerRightIcon: TitleBarSlotItem;

  public menuItems: TitleBarMenuItem[] = [];

  constructor(
    public themeService: ThemeService,
  ) {
    themeService.activeTheme.subscribe((activeTheme) => {
      this.setTitleBarTheme(activeTheme);
    });
  }

  /**
   * Sets the main title bar title information. Pass null to clear the previous title.
   * Apps are responsible for managing this title from their internal screens.
   *
   * @param title Main title to show on the title bar. If title is not provided, the title bar shows the default title (the app name)
   */
  public setTitle(title: string) {
    this.title = title;
  }

  /**
   * Sets the status bar background color.
   *
   * @param hexColor Hex color code with format "#RRGGBB"
   */
  public setTheme(backgroundColor: string, color: string) {
    this.theme.backgroundColor = backgroundColor;
    this.theme.color = color;
  }

  /**
   * Adds a listener to be notified when an icon is clicked. This works for both flat icons
   * (setIcon()) and menu items (setupMenuItems()). Use the icon "key" field to know which
   * icon was clicked.
   *
   * @param onItemClicked Callback called when an item is clicked.
   */
  public addOnItemClickedListener(onItemClicked: (icon: TitleBarSlotItem | TitleBarMenuItem) => void) {
    return onItemClicked;
  }

  /**
   * Remove a listener.
   *
   * @param onItemClicked Callback called when an item is clicked.
   */
  public removeOnItemClickedListener(onItemClicked: (icon: TitleBarSlotItem | TitleBarMenuItem) => void) {
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
    switch (iconSlot) {
      case TitleBarIconSlot.OUTER_LEFT:
        if(icon) {
          this.outerLeftIcon.visibile = true;
          this.outerLeftIcon.key = icon.key;
          this.outerLeftIcon.iconPath = icon.iconPath;
        } else {
          this.outerLeftIcon.visibile = false;
          this.outerLeftIcon.key = null;
          this.outerLeftIcon.iconPath = null;
        }
        break;
      case TitleBarIconSlot.INNER_LEFT:
        if(icon) {
          this.innerLeftIcon.visibile = true;
          this.innerLeftIcon.key = icon.key;
          this.innerLeftIcon.iconPath = icon.iconPath;
        } else {
          this.innerLeftIcon.visibile = false;
          this.innerLeftIcon.key = null;
          this.innerLeftIcon.iconPath = null;
        }
        break;
      case TitleBarIconSlot.INNER_RIGHT:
        if(icon) {
          this.innerRightIcon.visibile = true;
          this.innerRightIcon.key = icon.key;
          this.innerRightIcon.iconPath = icon.iconPath;
        } else {
          this.innerRightIcon.visibile = false;
          this.innerRightIcon.key = null;
          this.innerRightIcon.iconPath = null;
        }
        break;
      case TitleBarIconSlot.OUTER_RIGHT:
        if(icon) {
          this.outerRightIcon.visibile = true;
          this.outerRightIcon.key = icon.key;
          this.outerRightIcon.iconPath = icon.iconPath;
        } else {
          this.outerRightIcon.visibile = false;
          this.outerRightIcon.key = null;
          this.outerRightIcon.iconPath = null;
        }
        break;
    }
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
    this.menuItems = this.menuItems;
  }

  /**
   * Adds a badge marker on the top right of an icon slot. Used for example to shows that some
   * notifications are available, unread messages, etc.
   *
   * @param badgeSlot Location to configure.
   * @param count Number to display as a badge over the icon. A value of 0 hides the badge.
   */
  public setBadgeCount(iconSlot: TitleBarIconSlot, count: number) {
    switch (iconSlot) {
      case TitleBarIconSlot.OUTER_LEFT:
        this.outerLeftIcon.badgeCount = count;
        break;
      case TitleBarIconSlot.INNER_LEFT:
        this.innerLeftIcon.badgeCount = count;
        break;
      case TitleBarIconSlot.INNER_RIGHT:
        this.innerRightIcon.badgeCount = count;
        break;
      case TitleBarIconSlot.OUTER_LEFT:
        this.outerRightIcon.badgeCount = count;
        break;
    }
  }

  /**
   * Toggles the visibility status of both the elastOS internal title bar, and the native system
   * status bar. Hiding both bars makes the application become fullscreen.
   *
   * Note that calling this API requires a user permission in order to safely enter fullscreen mode.
   */
  public setVisibility(visibile: boolean) {
    this.visibile = visibile;
  }

  public setMenuVisibility(visible: boolean) {
    this.menuVisible = visible;
  }

  public setTitleBarTheme(theme: AppTheme) {
    if (theme === AppTheme.LIGHT) {
      document.body.classList.remove("dark");
      this.theme.backgroundColor = '#f8f8ff';
      this.theme.color = '#000000'
    } else {
      document.body.classList.add("dark");
      this.theme.backgroundColor = '#191a2f';
      this.theme.color = '#ffffff';
    }
  }
}
