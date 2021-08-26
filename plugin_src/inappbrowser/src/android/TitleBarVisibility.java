package org.elastos.essentials.plugins.dappbrowser;

public enum TitleBarVisibility {
    VISIBLE(0),
    HIDDEN(1);

    private int mValue;

    TitleBarVisibility(int value) {
        mValue = value;
    }

    public static TitleBarVisibility fromId(int value) {
        for(TitleBarVisibility t : values()) {
            if (t.mValue == value) {
                return t;
            }
        }
        return VISIBLE;
    }
}