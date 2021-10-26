/*
 * Copyright (c) 2021 Elastos Foundation
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

package org.elastos.essentials.plugins.dappbrowser;

import org.json.JSONObject;
import java.lang.reflect.Field;

public class DappBrowserOptions {
    public boolean titlebar = true;
    public int titlebarheight = 50;
    public boolean progressbar = true;
    public boolean loadurl = true;
    public String backgroundcolor = "#FFFFFF";

    public boolean cleardata = false;
    public boolean clearcache = false;
    public boolean clearsessioncache = false;
    public boolean hidespinner = false;

    public boolean enableviewportscale = false;
    public boolean mediaPlaybackRequiresUserAction = false;
    public boolean allowinlinemediaplayback = false;
    public boolean hidden = false;
    public boolean disallowoverscroll = false;
    public boolean hidenavigationbuttons = false;
    public boolean lefttoright = false;
    public String beforeload = "";

    public boolean showZoomControls = false;
    public boolean useWideViewPort = true;
    public boolean shouldPauseOnSuspend = false;
    public boolean hadwareBackButton = true;

    public String atdocumentstartscript = "";

    static DappBrowserOptions parseOptions(String options) throws Exception {
        DappBrowserOptions obj = new DappBrowserOptions();

        if (options != null) {
            JSONObject json = new JSONObject(options);

            Field[] fields = obj.getClass().getDeclaredFields();
            for (int i = 0, len = fields.length; i < len; i++) {
                String key = fields[i].getName();

                if (json.has(key)) {
                    String typeName = null;
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                        typeName = fields[i].getGenericType().getTypeName();
                        if (typeName.equals("boolean")) {
                            fields[i].setBoolean(obj, json.getBoolean(key));
                        }
                        else if (typeName.equals("int")) {
                            fields[i].setInt(obj, json.getInt(key));
                        }
                        else if (typeName.equals("java.lang.String")) {
                            fields[i].set(obj, json.getString(key));
                        }
                    }
                }
            }
        }

        return obj;
    }
}