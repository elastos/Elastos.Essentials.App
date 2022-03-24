
package org.elastos.essentials.plugins.internal;

import android.os.Looper;
import android.view.Window;
import android.view.WindowManager;

import org.apache.cordova.CallbackContext;

public class Security {

    private static String LOG_TAG = Security.class.getName();

    public static boolean isMainThread() {
        return Looper.getMainLooper().getThread() == Thread.currentThread();
    }

    public static void setScreenCapture(Boolean isEnable, CallbackContext callbackContext) {
        Window window = InternalPlugin.getInstance().cordova.getActivity().getWindow();
        if (isEnable) {
            window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
        }
        else {
            window.addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        }

        callbackContext.success();
    }

    public static void setScreenCaptureOnMainThread(Boolean isEnable, CallbackContext callbackContext) {
        if (isMainThread()) {
            setScreenCapture(isEnable, callbackContext);
        }
        else {
            InternalPlugin.getInstance().cordova.getActivity().runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    setScreenCapture(isEnable, callbackContext);
                }
            });
        }
    }

}
