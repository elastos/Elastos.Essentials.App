/*
* Copyright (c) 2018-2021 Elastos Foundation
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/

/**
* This plugin allows dApps to communicate with the global native title bar embedded in all elastOS dApps.
* DApps can change the title background color, set a title, customize action icons and more.
* <br><br>
* Usage:
* <br>
* declare let titleBarManager: TitleBarPlugin.TitleBarManager;
*/

declare namespace BrowserToolBar {
    /**
     * Type of activity indicators that the title bar can display.
     * Activity indicators are icon animations showing that something is currently busy.
     */
   const enum TitleBarActivityType {
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
    const enum TitleBarForegroundMode {
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
    const enum TitleBarBehavior {
        /** The title bar can be configured by apps: back/close icons, menus, app-specific icons. */
        DEFAULT = 0,
        /** The title bar displays icons for notifications, running apps, scanner and settings */
        DESKTOP = 1
    }

    /**
     * Status for the top left icon that can switch from one mode to another.
     */
    const enum TitleBarNavigationMode {
        /** Home icon - minimizes the currently active app and returns to launcher. */
        HOME = 0,
        /** Close icon - closes the currently active app and returns to the launcher. */
        CLOSE = 1
    }

    /**
     * Built-in convenience icons that can be used as icon paths instead fo providing a custom icon path.
     */
    const enum BuiltInIcon {
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
    type TitleBarIcon = {
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
    type TitleBarMenuItem = TitleBarIcon & {
        /** Localized menu item display title. */
        title: String
    }

    const enum TitleBarDisplayMode {
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
    const enum TitleBarIconSlot {
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
    const enum TitleBarVisibility {
        /** The internal title bar is visible (default) */
        VISIBLE = 0,
        /** The internal title bar is totally hidden. */
        HIDDEN = 1
    }

    /**
     * Native OS status bar visibility state.
     */
    const enum NativeStatusBarVisibility {
        /** The native platform status bar is visible (default) */
        VISIBLE = 0,
        /** The native platform status bar is totally hidden (elastOS is over it). */
        HIDDEN = 1
    }

    interface ToolBarManager {
        /**
         * Sets the main title bar title information. Pass null to clear the previous title.
         * Apps are responsible for managing this title from their internal screens.
         *
         * @param title Main title to show on the title bar. If title is not provided, the title bar shows the default title (the app name)
         */
        setTitle(title?: String);

        /**
         * Sets the status bar background color.
         *
         * @param hexColor Hex color code with format "#RRGGBB"
         */
        setBackgroundColor(hexColor: String);

        /**
         * Sets the title bar foreground (title, icons) color. Use this API in coordination with
         * setBackgroundColor() in order to adjust foreground with background.
         *
         * @param foregroundMode A @TitleBarForegroundMode mode, LIGHT or DARK.
         */
        setForegroundMode(foregroundMode: TitleBarForegroundMode);

        /**
         * Changes the top left icon appearance and behaviour. See @TitleBarNavigationMode for available
         * navigation modes.
         *
         * @param navigationMode See @TitleBarNavigationMode
         */
        setNavigationMode(navigationMode: TitleBarNavigationMode);

        /**
         * Shows or hide the top left navigation icon. That navigation icon is controlled by the runtime,
         * not by the application, so that users can always minimize or exit the application.
         *
         * This API is protected and usable only by some privileged apps. Other apps are not allowed to
         * hide the navigation icon.
         *
         * @param visible Whether to show the navigation icon or not.
         */
        setNavigationIconVisibility(visible: boolean);

        /**
         * Adds a listener to be notified when an icon is clicked. This works for both flat icons
         * (setIcon()) and menu items (setupMenuItems()). Use the icon "key" field to know which
         * icon was clicked.
         *
         * @param onItemClicked Callback called when an item is clicked.
         */
        addOnItemClickedListener(onItemClicked: (icon: TitleBarIcon | TitleBarMenuItem)=>void)

        /**
         * Remove a listener.
         *
         * @param onItemClicked Callback called when an item is clicked.
         */
        removeOnItemClickedListener(onItemClicked: (icon: TitleBarIcon | TitleBarMenuItem)=>void)

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
        setIcon(iconSlot: TitleBarIconSlot, icon: TitleBarIcon);

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
        setupMenuItems(menuItems: TitleBarMenuItem[]);

        /**
         * Adds a badge marker on the top right of an icon slot. Used for example to shows that some
         * notifications are available, unread messages, etc.
         *
         * @param badgeSlot Location to configure.
         * @param count Number to display as a badge over the icon. A value of 0 hides the badge.
         */
        setBadgeCount(iconSlot: TitleBarIconSlot, count: number);

        /**
         * Shows an indicator on the title bar to indicate that something is busy.
         * Several dApps can interact with an activity indicator at the same time. As long as there
         * is at least one dApp setting an indicator active, that indicator remains shown.
         *
         * @param type Type of activity indicator to start showing.
         * @param hintText Optional text to display during the animation.
         */
        showActivityIndicator(type: TitleBarActivityType, hintText?: string);

        /**
         * Requests to hide a given activity indicator. In case other dApps are still busy using
         * this indicator, the activity indicator remains active, until the last dApp releases it.
         *
         * @param type Type of activity indicator to stop showing for the active dApp.
         */
        hideActivityIndicator(type: TitleBarActivityType);

        /**
         * Toggles the visibility status of both the elastOS internal title bar, and the native system
         * status bar. Hiding both bars makes the application become fullscreen.
         *
         * Note that calling this API requires a user permission in order to safely enter fullscreen mode.
         */
        setVisibility(titleBarVisibility: TitleBarVisibility, statusBarVisibility: NativeStatusBarVisibility);

        /*
         * @deprecated
         *
         * Changes the overall behavior of the title bar.
         *
         * Accessible only by the launcher app. Other apps use the DEFAULT behavior.
         *
         * @param behavior A @TitleBarBehavior behavior to globally configure the title bar.
         */
        setBehavior(behavior: TitleBarBehavior);
    }
}