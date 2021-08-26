package org.elastos.essentials.plugins.dappbrowser;

public enum TitleBarForegroundMode {
    LIGHT(0),
    DARK(1);

    private int mValue;

    TitleBarForegroundMode(int value) {
        mValue = value;
    }

    public static TitleBarForegroundMode fromId(int value) {
        for(TitleBarForegroundMode t : values()) {
            if (t.mValue == value) {
                return t;
            }
        }
        return LIGHT;
    }
}