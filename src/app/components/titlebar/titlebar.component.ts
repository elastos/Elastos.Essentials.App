import { Component, Input } from '@angular/core';
import { AppTheme, GlobalThemeService } from '../../services/global.theme.service';
import { PopoverController } from '@ionic/angular';
import { TitlebarmenuitemComponent } from '../titlebarmenuitem/titlebarmenuitem.component';
import { TitleBarTheme, TitleBarSlotItem, TitleBarMenuItem, TitleBarIconSlot, TitleBarIcon, TitleBarNavigationMode, BuiltInIcon, TitleBarForegroundMode } from './titlebar.types';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { Logger } from 'src/app/logger';

@Component({
  selector: 'app-titlebar',
  templateUrl: './titlebar.component.html',
  styleUrls: ['./titlebar.component.scss'],
})
export class TitleBarComponent {

  public menu: any = null;

  @Input()
  set title(title: string) {
      this._title = title;
  }

  public _title = "";

  public visibile = true;
  public menuVisible = false;
  private navigationMode: TitleBarNavigationMode;

  public theme: TitleBarTheme = { backgroundColor: "#FFFFFF", color: "000000" };
  public foregroundMode: TitleBarForegroundMode;

  public icons: TitleBarSlotItem[] = [
    TitleBarComponent.makeDefaultIcon(), // outer left
    TitleBarComponent.makeDefaultIcon(), // inner left
    TitleBarComponent.makeDefaultIcon(), // inner right
    TitleBarComponent.makeDefaultIcon()  // outer right
  ];

  private itemClickedListeners: ((icon: TitleBarSlotItem | TitleBarMenuItem) => void)[] = [];

  public menuItems: TitleBarMenuItem[] = [];

  constructor(
    public themeService: GlobalThemeService,
    private popoverCtrl: PopoverController,
    public globalNav: GlobalNavService,
    public globalNotifications: GlobalNotificationsService,
  ) {
    themeService.activeTheme.subscribe((activeTheme) => {
      this.setTitleBarTheme(activeTheme);
    });

    // Set home navigation for all apps
    this.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: null, iconPath: BuiltInIcon.ELASTOS });

    // Set the default navigation mode (used by most apps)
    this.setNavigationMode(TitleBarNavigationMode.BACK);
  }

  private static makeDefaultIcon(): TitleBarSlotItem {
    return {
      visible: false,
      key: null,
      iconPath: null,
      badgeCount: 0
    };
  }

  /**
   * Sets the main title bar title information. Pass null to clear the previous title.
   * Apps are responsible for managing this title from their internal screens.
   *
   * @param title Main title to show on the title bar. If title is not provided, the title bar shows the default title (the app name)
   */
  public setTitle(title: string) {
    this._title = title;
  }

  /**
   * Sets the status bar background color.
   *
   * @param hexColor Hex color code with format "#RRGGBB"
   */
  public setTheme(backgroundColor: string, foregroundMode: TitleBarForegroundMode) {
    this.setBackgroundColor(backgroundColor);
    this.setForegroundMode(foregroundMode);
  }

  /**
   * Sets the status bar background color.
   *
   * @param hexColor Hex color code with format "#RRGGBB"
   */
  public setBackgroundColor(hexColor: string){
    this.theme.backgroundColor = hexColor;
  }

  /**
   * Sets the title bar foreground (title, icons) color. Use this API in coordination with
   * setBackgroundColor() in order to adjust foreground with background.
   *
   * @param foregroundMode A @TitleBarForegroundMode mode, LIGHT or DARK.
   */
  public setForegroundMode(foregroundMode: TitleBarForegroundMode) {
    this.foregroundMode = foregroundMode;

    if (foregroundMode == TitleBarForegroundMode.LIGHT)
      this.theme.color = "#FFFFFF";
    else
      this.theme.color = "#000000";
  }

  /**
   * Adds a listener to be notified when an icon is clicked. This works for both flat icons
   * (setIcon()) and menu items (setupMenuItems()). Use the icon "key" field to know which
   * icon was clicked.
   *
   * @param onItemClicked Callback called when an item is clicked.
   */
  public addOnItemClickedListener(onItemClicked: (icon: TitleBarSlotItem | TitleBarMenuItem) => void) {
    this.itemClickedListeners.push(onItemClicked);
  }

  /**
   * Remove a listener.
   *
   * @param onItemClicked Callback called when an item is clicked.
   */
  public removeOnItemClickedListener(onItemClicked: (icon: TitleBarSlotItem | TitleBarMenuItem) => void) {
    this.itemClickedListeners.splice(this.itemClickedListeners.indexOf(onItemClicked), 1);
  }

  /**
   * Configures icons displayed on the left or right of the main title.
   *
   * If a caller requests to edit the OUTER_LEFT icon, we automatically switch to CUSTOM navigation mode.
   *
   * @param iconSlot Location to configure.
   * @param icon Icon and action to be used at this slot. Use null to clear any existing configuration.
   */
  public setIcon(iconSlot: TitleBarIconSlot, icon: TitleBarIcon) {
    if(icon) {
      this.icons[iconSlot].visible = true;
      this.icons[iconSlot].key = icon.key;
      this.icons[iconSlot].iconPath = icon.iconPath;
    } else {
      this.icons[iconSlot].visible = false;
      this.icons[iconSlot].key = null;
      this.icons[iconSlot].iconPath = null;
    }
  }

  getIconPath(iconSlot: TitleBarIconSlot) {
    // Special case for the outer right icon in case a menu is configured
    if (iconSlot == TitleBarIconSlot.OUTER_RIGHT && this.menuVisible) {
      return !this.themeService.darkMode ? '/assets/components/titlebar/horizontal_menu.svg' : '/assets/components/titlebar/darkmode/horizontal_menu.svg';
    }

    // Replace built-in icon path placeholders with real picture path
    switch (this.icons[iconSlot].iconPath) {
      case BuiltInIcon.ELASTOS:
        return this.foregroundMode === TitleBarForegroundMode.DARK ? 'assets/components/titlebar/elastos.svg' : 'assets/components/titlebar/darkmode/elastos.svg';
      case BuiltInIcon.BACK:
        return this.foregroundMode === TitleBarForegroundMode.DARK ? 'assets/components/titlebar/back.svg' : 'assets/components/titlebar/darkmode/back.svg';
      case BuiltInIcon.CLOSE:
        return this.foregroundMode === TitleBarForegroundMode.DARK ? 'assets/components/titlebar/close.svg' : 'assets/components/titlebar/darkmode/close.svg';
      case BuiltInIcon.SCAN:
        return this.foregroundMode === TitleBarForegroundMode.DARK ? 'assets/components/titlebar/scan.svg' : 'assets/components/titlebar/darkmode/scan.svg';
      case BuiltInIcon.ADD:
        return this.foregroundMode === TitleBarForegroundMode.DARK ? 'assets/components/titlebar/add.svg' : 'assets/components/titlebar/darkmode/add.svg';
      case BuiltInIcon.DELETE:
        return this.foregroundMode === TitleBarForegroundMode.DARK ? 'assets/components/titlebar/delete.svg' : 'assets/components/titlebar/darkmode/delete.svg';
      case BuiltInIcon.SETTINGS:
        return this.foregroundMode === TitleBarForegroundMode.DARK ? 'assets/components/titlebar/settings.svg' : 'assets/components/titlebar/darkmode/settings.svg';
      case BuiltInIcon.HELP:
        return this.foregroundMode === TitleBarForegroundMode.DARK ? 'assets/components/titlebar/help.svg' : 'assets/components/titlebar/darkmode/help.svg';
      case BuiltInIcon.HORIZONTAL_MENU:
        return this.foregroundMode === TitleBarForegroundMode.DARK ? 'assets/components/titlebar/horizontal_menu.svg' : 'assets/components/titlebar/darkmode/horizontal_menu.svg';
      case BuiltInIcon.VERTICAL_MENU:
        return this.foregroundMode === TitleBarForegroundMode.DARK ? 'assets/components/titlebar/vertical_menu.svg' : 'assets/components/titlebar/darkmode/vertical_menu.svg';
      case BuiltInIcon.EDIT:
        return this.foregroundMode === TitleBarForegroundMode.DARK ? 'assets/components/titlebar/edit.svg' : 'assets/components/titlebar/darkmode/edit.svg';
      case BuiltInIcon.FAVORITE:
        return this.foregroundMode === TitleBarForegroundMode.DARK ? 'assets/components/titlebar/favorite.svg' : 'assets/components/titlebar/darkmode/favorite.svg';
      case BuiltInIcon.NOTIFICATIONS:
        return this.foregroundMode === TitleBarForegroundMode.DARK ? 'assets/components/titlebar/notification.svg' : 'assets/components/titlebar/darkmode/notification.svg';
      default:
        // Nothing, we'll use the real given path.
        return this.icons[iconSlot].iconPath;
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
    this.menuItems = menuItems;
  }

  /**
   * Adds a badge marker on the top right of an icon slot. Used for example to shows that some
   * notifications are available, unread messages, etc.
   *
   * @param badgeSlot Location to configure.
   * @param count Number to display as a badge over the icon. A value of 0 hides the badge.
   */
  public setBadgeCount(iconSlot: TitleBarIconSlot, count: number) {
    this.icons[iconSlot].badgeCount = count;
  }

  /**
   * Toggles the visibility status of both the Elastos Essentials internal title bar, and the native system
   * status bar. Hiding both bars makes the application become fullscreen.
   *
   * Note that calling this API requires a user permission in order to safely enter fullscreen mode.
   */
  public setVisibility(visibile: boolean) {
    this.visibile = visibile;
  }

  /**
   * Setting this to true will automatically add the icon to TitleBarIconSlot.OUTER_RIGHT slot with key 'menu' to be listened to
  */
  public setMenuVisibility(visible: boolean) {
    if(visible) {
      this.menuVisible = visible;
    } else {
      this.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);
    }
  }

  /**
   * Changes the top left inner icon appearance and behaviour. See @TitleBarNavigationMode for available
   * navigation modes.
   *
   * @param navigationMode See @TitleBarNavigationMode
   */
  public setNavigationMode(navigationMode: TitleBarNavigationMode, customIcon?: TitleBarIcon) {
    this.navigationMode = navigationMode;

    if (navigationMode == TitleBarNavigationMode.BACK)
      this.setIcon(TitleBarIconSlot.INNER_LEFT, { key: "back", iconPath: BuiltInIcon.BACK });
    else if (navigationMode == TitleBarNavigationMode.CLOSE)
      this.setIcon(TitleBarIconSlot.INNER_LEFT, { key: "close", iconPath: BuiltInIcon.CLOSE });
    else if(navigationMode == TitleBarNavigationMode.CUSTOM && customIcon)
      this.setIcon(TitleBarIconSlot.INNER_LEFT, { key: customIcon.key, iconPath: customIcon.iconPath });
    else
      this.setIcon(TitleBarIconSlot.INNER_LEFT, null);
  }

  private listenableIconClicked(icon: TitleBarSlotItem | TitleBarMenuItem) {
    // Custom icon, call the icon listener
    this.itemClickedListeners.forEach((listener)=>{
      listener(icon);
    });
  }

  outerLeftIconClicked() {
    this.icons[TitleBarIconSlot.OUTER_LEFT].iconPath === BuiltInIcon.ELASTOS ?
      void this.globalNav.navigateHome() :
      this.listenableIconClicked(this.icons[TitleBarIconSlot.OUTER_LEFT]);
  }

  innerLeftIconClicked() {
    if (this.navigationMode == TitleBarNavigationMode.BACK || this.navigationMode == TitleBarNavigationMode.CLOSE) {
      if (this.globalNav.canGoBack())
        void this.globalNav.navigateBack();
      else
        // Fallback: should not happen, but just in case, if we can't really "go back", we just go "home" without crashing
        void this.globalNav.navigateHome();
    }
    else {
      this.listenableIconClicked(this.icons[TitleBarIconSlot.INNER_LEFT]);
    }
  }

  innerRightIconClicked() {
    this.listenableIconClicked(this.icons[TitleBarIconSlot.INNER_RIGHT]);
  }

  outerRightIconClicked(ev) {
    this.menuVisible ?
      void this.openMenu(ev) :
      this.listenableIconClicked(this.icons[TitleBarIconSlot.OUTER_RIGHT]);
  }

  async openMenu(ev) {
    this.menu = await this.popoverCtrl.create({
      mode: 'ios',
      component: TitlebarmenuitemComponent,
      componentProps: {
        items: this.menuItems
      },
      cssClass: !this.themeService.darkMode ? 'titlebarmenu-component' : 'titlebarmenu-component',
      backdropDismiss: true,
      event: ev
    });
    this.menu.onWillDismiss().then((res) => {
      if(res.data) {
        this.listenableIconClicked(res.data.item);
      }
      this.menu = null;
    });
    return await this.menu.present();
  }

  public setTitleBarTheme(theme: AppTheme) {
    if (theme === AppTheme.LIGHT) {
      document.body.classList.remove("dark");
      this.theme.backgroundColor = '#F5F5FD';
      this.theme.color = '#000000'
      this.foregroundMode = TitleBarForegroundMode.DARK;
    } else {
      document.body.classList.add("dark");
      this.theme.backgroundColor = '#121212';
      this.theme.color = '#ffffff';
      this.foregroundMode = TitleBarForegroundMode.LIGHT;
    }
  }

  needToShowRedDot() {
    return (this.icons[3].iconPath === BuiltInIcon.NOTIFICATIONS)
        && (this.globalNotifications.notifications.length > 0);
  }
}
