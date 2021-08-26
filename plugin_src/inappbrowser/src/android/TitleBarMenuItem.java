package org.elastos.essentials.plugins.dappbrowser;

import org.json.JSONException;
import org.json.JSONObject;

public class TitleBarMenuItem extends TitleBarIcon {
    String title;

    protected TitleBarMenuItem() {}

    public TitleBarMenuItem(String key, String iconPath, String title) {
        super(key, iconPath);

        this.title = title;
    }

    public static TitleBarMenuItem fromJSONObject(JSONObject jsonObject) {
        TitleBarMenuItem icon = new TitleBarMenuItem();

        try {
            icon.fillFromJSONObject(jsonObject);
            return icon;
        }
        catch (JSONException e) {
            return null;
        }
    }

    protected void fillFromJSONObject(JSONObject jsonObject) throws JSONException {
        super.fillFromJSONObject(jsonObject);

        title = jsonObject.getString("title");
    }

    protected void fillJSONObject(JSONObject jsonObject) throws JSONException {
        super.fillJSONObject(jsonObject);

        jsonObject.put("title", title);
    }
}