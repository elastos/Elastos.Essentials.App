package org.elastos.essentials.plugins.dappbrowser;

enum BuiltInIcon {
    ELASTOS("elastos"),
    LOCK("lock"),
    BACK("back"),
    CLOSE("close"),
    SCAN("scan"),
    ADD("add"),
    DELETE("delete"),
    SETTINGS("settings"),
    HELP("help"),
    HORIZONTAL_MENU("horizontal_menu"),
    VERTICAL_MENU("vertical_menu"),
    EDIT("edit"),
    FAVORITE("favorite");

    private String mValue;

    BuiltInIcon(String value) {
        mValue = value;
    }

    public static BuiltInIcon fromString(String value) {
        for(BuiltInIcon t : values()) {
            if (t.mValue.equals(value)) {
                return t;
            }
        }
        return null;
    }
}