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


/**
* This is an plugin for Elastos Cordova in order to manage external
* inter-app communications through "intents".
* <br><br>
* Usage:
* <br>
* declare let dappBrowser: IntentPlugin.DappBrowser;
*/

declare namespace DappBrowserPlugin {

    /**
    * The bootstrap node information.
    */
    type DappBrowserOptions = {
        /**
         * (iOS Only) Set to yes or no to allow in-line HTML5 media playback, displaying within the browser window rather than a device-specific playback interface.
         * The HTML's video element must also include the webkit-playsinline attribute (defaults to no)
         */
        allowInlineMediaPlayback?: boolean;
        /**
         * set to enable the beforeload event to modify which pages are actually loaded in the browser. Accepted values are get to
         * intercept only GET requests, post to intercept on POST requests or yes to intercept both GET & POST requests.
         * Note that POST requests are not currently supported and will be ignored (if you set beforeload=post it will raise an error).
         */
        beforeload?: 'yes' | 'get' | 'post';
        /** Set to yes to have the browser's cookie cache cleared before the new window is opened. */
        clearcache?: boolean;
        /**  set to yes to have the browser's entire local storage cleared (cookies, HTML5 local storage, IndexedDB, etc.) before the new window is opened */
        cleardata?: boolean;
        /**
         * Set to yes to have the session cookie cache cleared before the new window is opened.
         * For WKWebView, requires iOS 11+ on target device.
         */
        clearsessioncache?: boolean;
        /**
         * (Android) Set to a string to use as the close button's caption instead of a X. Note that you need to localize this value yourself.
         * (iOS) Set to a string to use as the Done button's caption. Note that you need to localize this value yourself.
         */
        closebuttoncaption?: string;
        /**
         * (Android) Set to a valid hex color string, for example: #00ff00, and it will change the close button color from default, regardless of being a text or default X. Only has effect if user has location set to yes.
         * (iOS) Set as a valid hex color string, for example: #00ff00, to change from the default Done button's color. Only applicable if toolbar is not disabled.
         */
        closebuttoncolor?: string;
        /** (iOS Only) Set to yes or no (default is no). Turns on/off the UIWebViewBounce property. */
        disallowoverscroll?: boolean;
        /** (iOS Only)  Set to yes or no to prevent viewport scaling through a meta tag (defaults to no). */
        enableViewportScale?: boolean;

        /**
         * (Windows only) Set to yes to create the browser control without a border around it.
         * Please note that if location=no is also specified, there will be no control presented to user to close IAB window.
         */
        fullscreen?: boolean;
        /**
         * (Android & Windows Only) Set to yes to use the hardware back button to navigate backwards through the DappBrowser's history.
         * If there is no previous page, the DappBrowser will close. The default value is yes, so you must set it to no if you want the back button to simply close the DappBrowser.
         */
        hardwareback?: boolean;
        /**
         * Set to yes to create the browser and load the page, but not show it. The loadstop event fires when loading is complete.
         * Omit or set to no (default) to have the browser open and load normally.
         */
        hidden?: boolean;
        /**
         * (Android) Set to yes to hide the navigation buttons on the location toolbar, only has effect if user has location set to yes. The default value is no.
         * (iOS) Set to yes or no to turn the toolbar navigation buttons on or off (defaults to no). Only applicable if toolbar is not disabled.
         */
        hidenavigationbuttons?: boolean;
        /**
         *  (iOS Only) Set to yes or no to change the visibility of the loading indicator (defaults to no).
         */
        hidespinner?: boolean;

        /** (iOS Only) Set to yes or no to open the keyboard when form elements receive focus via JavaScript's focus() call (defaults to yes). */
        keyboardDisplayRequiresUserAction?: boolean;

        // /**
        //  * (Android) Set to yes to swap positions of the navigation buttons and the close button. Specifically, navigation buttons go to the left and close button to the right.
        //  * (iOS) Set to yes to swap positions of the navigation buttons and the close button. Specifically, close button goes to the right and navigation buttons to the left.
        //  */
        // lefttoright?: boolean;

        /** Set to true or false to turn the DappBrowser's titlebar on or off. */
        titlebar?: boolean;
        /** Set the DappBrowser's titlebar height. */
        titlebarheight?: number;
        /** Set to true or false to turn the DappBrowser's progressbar on or off. */
        progressbar?: boolean;
        /** Set background Color, It is a hex string */
        backgroundcolor?: string;

        /** Set to true or false to load url on or off, when open. */
        loadurl?: boolean;

        /**
         *  Set to yes to prevent HTML5 audio or video from autoplaying (defaults to no).
         */
        mediaPlaybackRequiresUserAction?: boolean;

        /** (iOS Only) Set to pagesheet, formsheet or fullscreen to set the presentation style (defaults to fullscreen). */
        presentationstyle?: 'pagesheet' | 'formsheet' | 'fullscreen';
        /** (Android Only) Set to yes to make DappBrowser WebView to pause/resume with the app to stop background audio (this may be required to avoid Google Play issues) */
        shouldPauseOnSuspend?: boolean;
        /** (iOS Only) Set to yes or no to wait until all new view content is received before being rendered (defaults to no). */
        suppressesIncrementalRendering?: boolean;

        /** (iOS Only) Set to fliphorizontal, crossdissolve or coververtical to set the transition style (defaults to coververtical). */
        transitionstyle?: 'fliphorizontal' | 'crossdissolve' | 'coververtical';
        /** (Android Only) Sets whether the WebView should enable support for the "viewport" HTML meta tag or should use a wide viewport. When the value of the setting is no, the layout width is always set to the width of the WebView control in device-independent (CSS) pixels. When the value is yes and the page contains the viewport meta tag, the value of the width specified in the tag is used. If the page does not contain the tag or does not provide a width, then a wide viewport will be used. (defaults to yes). */
        useWideViewPort?: boolean;
        /** (iOS Only) Set to yes to use WKWebView engine for the DappBrowser. Omit or set to no (default) to use UIWebView. */
        usewkwebview?: boolean;
        /** (Android Only) Set to yes to show Android browser's zoom controls, set to no to hide them. Default value is yes. */
        showZoomControls?: boolean;
        /**
         * @hidden
         */
        [key: string]: any;
    }

    type DappBrowserEventType = 'loadstart' | 'loadstop' | 'loaderror' | 'exit' | 'beforeload'
                                    | 'message' | 'customscheme' | 'progress' | 'urlchanged' | 'menu' | 'head';
    type DappBrowserEvent = {
        /** the event name */
        type: DappBrowserEventType;
        /** the URL that was loaded. */
        url?: string;
        /** the error code, only in the case of loaderror. */
        code?: number;
        /** the error message, only in the case of loaderror. */
        message?: string;
        /** the exit mode. */
        mode?: string;
        /** the progress */
        progress?: number;
        /** the postMessage data, only in the case of message. */
        data?: any;
    }

    /**
     *
     */
    interface DappBrowser {

        /**
         * Opens a URL in a new DappBrowser instance, the current browser instance, or the system browser.
         * @param {string} url     The URL to load.
         * @param {string} [target="_webview"]  The target in which to load the URL, an optional parameter that defaults to _webview.
         *                 _self: Opens in the WebView if the URL is in the white list, otherwise it opens in the DappBrowser.
         *                 _webview: Opens in the Webview.
         *                 _system: Opens in the system's web browser.
         * @param {string | DappBrowserOptions} [options] Options for the DappBrowser. Optional, defaulting to: location=yes.
         *                 The options string must not contain any blank space, and each feature's
         *                 name/value pairs must be separated by a comma. Feature names are case insensitive.
         */
        open(url: string, target?: string, options?: string | DappBrowserOptions): Promise<void>;

        /**
         * Method to be called after the "beforeload" event to continue the script
         * @param strUrl {String} The URL the DappBrowser should navigate to.
         */
        loadAfterBeforeload(strUrl: string): Promise<void>;

        /**
         * Displays an DappBrowser window that was opened hidden. Calling this has no effect
         * if the DappBrowser was already visible.
         */
        show(): Promise<void>;

        /**
         * Closes the DappBrowser.
         */
        close(mode?: string): Promise<void>;

        /**
         * Hides an DappBrowser window that is currently shown. Calling this has no effect
         * if the DappBrowser was already hidden.
         */
        hide(): void;

        /**
         * Injects JavaScript code into the DappBrowser window.
         * @param script {Object} Details of the script to run, specifying either a file or code key.
         * @returns {Promise<any>}
         */
        executeScript(script: {
            file?: string;
            code?: string;
        }): Promise<any>;

        /**
         * Injects CSS into the DappBrowser window.
         * @param css {Object} Details of the script to run, specifying either a file or code key.
         * @returns {Promise<any>}
         */
        insertCSS(css: {
            file?: string;
            code?: string;
        }): Promise<any>;

        /**
         * Load url in DappBrowser
         */
        loadUrl(url: string): Promise<void>;

        /**
         * Reload url in DappBrowser
         */
        reload(): Promise<void>;

        /**
         * set title in DappBrowser
         */
        setTitle(title: string): Promise<void>;

        /**
         * Check DappBrowser whether can go back
         */
        canGoBack(): Promise<Boolean>;

        /**
         *  DappBrowser go back
         */
        goBack(): Promise<void>;

        /**
         *  Get webview screen shot, will retutrn the base64 image string.
         */
        getWebViewShot(): Promise<string>;

        /**
         *  Set webview alpha, alpha vaule from=0.0, to=1.0
         */
        setAlpha(alpha: number): Promise<void>;

        /**
         *
         * Add listener for event callback.
         *
         * @param callback   The function receive the event.
         */
        addEventListener(callback: (event: DappBrowserEvent)=>void);

        /**
         *
         * Remove listener for event callback.
         *
         */
        removeEventListener(): Promise<void>;

        /**
         *
         * Clear data for url.
         *
         */
        clearData(url: string): Promise<void>;

    }
}