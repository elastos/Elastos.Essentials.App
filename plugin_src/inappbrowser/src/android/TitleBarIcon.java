package org.elastos.essentials.plugins.dappbrowser;

import org.json.JSONException;
import org.json.JSONObject;

public class TitleBarIcon {
    String key;
    String iconPath;
    BuiltInIcon builtInIcon;

    protected TitleBarIcon() {}

    TitleBarIcon(String key, String iconPath) {
        this.key = key;
        this.iconPath = iconPath;
    }

    public static TitleBarIcon fromJSONObject(JSONObject jsonObject) {
        if (jsonObject == null)
            return null;

        TitleBarIcon icon = new TitleBarIcon();

        try {
            icon.fillFromJSONObject(jsonObject);
            return icon;
        }
        catch (JSONException e) {
            return null;
        }
    }

    protected void fillFromJSONObject(JSONObject jsonObject) throws JSONException {
        key = jsonObject.getString("key");
        iconPath = jsonObject.getString("iconPath");

        // Try to convert it to a built in icon
        builtInIcon = BuiltInIcon.fromString(iconPath);
    }

    public JSONObject toJSONObject() throws JSONException  {
        JSONObject jsonObject = new JSONObject();

        fillJSONObject(jsonObject);

        return jsonObject;
    }

    protected void fillJSONObject(JSONObject jsonObject) throws JSONException {
        jsonObject.put("key", key);
        jsonObject.put("iconPath", iconPath);
    }

    public boolean isBuiltInIcon() {
        return builtInIcon != null;
    }
}