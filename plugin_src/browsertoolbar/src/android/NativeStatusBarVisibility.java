package org.elastos.essentials.plugins.browsertoolbar;

public enum NativeStatusBarVisibility {
    VISIBLE(0),
    HIDDEN(1);

    private int mValue;

    NativeStatusBarVisibility(int value) {
        mValue = value;
    }

    public static NativeStatusBarVisibility fromId(int value) {
        for(NativeStatusBarVisibility t : values()) {
            if (t.mValue == value) {
                return t;
            }
        }
        return VISIBLE;
    }
}