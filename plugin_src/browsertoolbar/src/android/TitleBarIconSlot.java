package org.elastos.essentials.plugins.browsertoolbar;

public enum TitleBarIconSlot {
    /** Icon on title bar's left edge. */
    OUTER_LEFT(0),
    /** Icon between the outer left icon and the title. */
    INNER_LEFT(1),
    /** Icon between the title and the outer right icon. */
    INNER_RIGHT(2),
    /** Icon on title bar's right edge. */
    OUTER_RIGHT(3);

    private int mValue;

    TitleBarIconSlot(int value) {
        mValue = value;
    }

    public static TitleBarIconSlot fromId(int value) {
        for(TitleBarIconSlot t : values()) {
            if (t.mValue == value) {
                return t;
            }
        }
        return INNER_LEFT;
    }
}
