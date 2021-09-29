/*
       Licensed to the Apache Software Foundation (ASF) under one
       or more contributor license agreements.  See the NOTICE file
       distributed with this work for additional information
       regarding copyright ownership.  The ASF licenses this file
       to you under the Apache License, Version 2.0 (the
       "License"); you may not use this file except in compliance
       with the License.  You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing,
       software distributed under the License is distributed on an
       "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
       KIND, either express or implied.  See the License for the
       specific language governing permissions and limitations
       under the License.
*/
package org.elastos.essentials.plugins.dappbrowser;

import android.app.Dialog;
import android.content.Context;
import android.webkit.WebView;
import android.widget.EditText;

import org.elastos.essentials.app.R;

/**
 * Created by Oliver on 22/11/2013.
 */
public class DappBrowserDialog extends Dialog {
    Context context;

    public TitleBar titleBar;

    public DappBrowserDialog(Context context, DappBrowserOptions options) {
        super(context, android.R.style.Theme_NoTitleBar);
        this.context = context;
        this.setContentView(R.layout.fragments_view);

        titleBar = this.findViewById(R.id.titlebar);
        titleBar.initialize(options);

        this.getWindow().setWindowAnimations(R.style.RightInRightOutAnim);
    }

    public void onBackPressed () {
        DappBrowserPlugin plugin = DappBrowserPlugin.getInstance();

        if (plugin.getWebView() == null) {
            this.dismiss();
        }
        else {
            // better to go through the in inAppBrowser
            // because it does a clean up
            if (plugin.webViewHandler.hardwareBack() && plugin.webViewHandler.canGoBack()) {
                plugin.webViewHandler.goBack();
            }  else {
                plugin.webViewHandler.close();
            }
        }
    }
}
