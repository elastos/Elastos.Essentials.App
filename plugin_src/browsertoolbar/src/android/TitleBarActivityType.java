package org.elastos.essentials.plugins.browsertoolbar;

public enum TitleBarActivityType {
    /** There is an on going download. */
    DOWNLOAD(0),
    /** There is an on going upload. */
    UPLOAD(1),
    /** There is on going application launch. */
    LAUNCH(2),
    /** There is another on going operation of an indeterminate type. */
    OTHER(3);

    private int mValue;

    TitleBarActivityType(int value) {
        mValue = value;
    }

    public static TitleBarActivityType fromId(int value) {
        for(TitleBarActivityType t : values()) {
            if (t.mValue == value) {
                return t;
            }
        }
        return OTHER;
    }
}