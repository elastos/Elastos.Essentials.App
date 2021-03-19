
/**
 * Built-in convenience icons that can be used as icon paths instead fo providing a custom icon path.
 */
export enum BuiltInIcon {
    /** Elastos default icon */
    ELASTOS = "elastos",
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
    FAVORITE = "favorite",
    /** Notifications */
    NOTIFICATIONS = "notifications"
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
    iconPath: string | BuiltInIcon
}

export type TitleBarSlotItem = TitleBarIcon & {
    visible: boolean
    badgeCount: number
}

/**
 * Type describing a context menu entry opened from the title bar. This is a standard icon type, with
 * an additional title.
 */
export type TitleBarMenuItem = TitleBarIcon & {
    /** Localized menu item display title. */
    title: string
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
 * Color mode for all icons and texts on the title bar.
 */
export const enum TitleBarForegroundMode {
    /** Title bar title and icons use a light (white) color. Use this on a dark background color. */
    LIGHT = 0,
    /** Title bar title and icons use a dark (dark gray) color. Use this on a light background color. */
    DARK = 1
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
 * Status for the top left icon that can switch from one mode to another.
 */
export enum TitleBarNavigationMode {
    /** Back icon - Navigates back in the router stack. Default mode */
    BACK = 0,
    /** Close icon - Navigates back in the router stack but shows a cross. */
    CLOSE = 1,
    /** No predefined outer left icon. All slots can be configured */
    CUSTOM = 2
}