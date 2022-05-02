package org.elastos.essentials.plugins.internal;

import android.view.ViewGroup;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;

import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;

import java.io.File;

/**
 * This class echoes a string called from JavaScript.
 */
public class InternalPlugin extends CordovaPlugin {

    static InternalPlugin instance = null;
    static InternalPlugin getInstance() {
        return instance;
    }

    @Override
    public void pluginInitialize() {
        instance = this;
    }

        @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        try {
            switch (action) {
                case "changeOldPath":
                    this.changeOldPath(args, callbackContext);
                    break;
                case "getStoreDataPath":
                    this.getStoreDataPath(args, callbackContext);
                    break;
                case "getDidStoragePath":
                    this.getDidStoragePath(args, callbackContext);
                    break;
                case "isDeviceRooted":
                    this.isDeviceRooted(callbackContext);
                case "setScreenCapture":
                    this.setScreenCapture(args, callbackContext);
                    break;

                default:
                    return false;
            }
        } catch (Exception e) {
            e.printStackTrace();
            callbackContext.error(e.getLocalizedMessage());
        }
        return true;
    }

    public String getStoreDataDir(String didStoreId) {
        return cordova.getActivity().getFilesDir() + "/data/did/" + didStoreId;
    }

    private void getStoreDataPath(JSONArray args, CallbackContext callbackContext) throws JSONException {
        String didStoreId = args.getString(0);
        callbackContext.success(getStoreDataDir(didStoreId));
    }

    public String getDIDDir(String did) {
        if (did != null) {
            did = did.replace(":", "_");
        }

        return did;
    }

    public String getDidStorageDir(String didStoreId, String didString) {
        return getStoreDataDir(didStoreId) + "/dids/" + getDIDDir(didString);
    }

    private void getDidStoragePath(JSONArray args, CallbackContext callbackContext) throws JSONException {
        String didStoreId = args.getString(0);
        String didString = args.getString(1);
        callbackContext.success(getDidStorageDir(didStoreId, didString));
    }

    public void moveFolder(String fromPath, String toPath) {
        File from = new File(fromPath);
        if (!from.exists()) {
            return;
        }

        File to = new File(toPath);
        if (to.isFile()) {
            to.delete();
        }
        if (to.exists()) {
            return;
        }
        to.mkdirs();

        File[] files = from.listFiles();
        for(int i = 0; i < files.length; i++) {
            //If toPath is subdir, don't move it
            if (!files[i].getAbsolutePath().equals(to.getAbsolutePath()) ) {
                File file = new File(toPath, files[i].getName());
                files[i].renameTo(file);
            }
        }
    }

    private void changeOldPath(JSONArray args, CallbackContext callbackContext) throws JSONException {
        String didStoreId = args.getString(0);
        String didString = args.getString(1);

        //move wallet dir
        String oldPath = cordova.getActivity().getFilesDir() + "/" + didString;
        String newPath = getDidStorageDir(didStoreId, didString);
        moveFolder(oldPath, newPath);
        callbackContext.success();
    }

    private void isDeviceRooted(CallbackContext callbackContext) {
        Boolean ret = CheckRooted.isDeviceRooted();
        callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, ret));
    }

    private void setScreenCapture(JSONArray args, CallbackContext callbackContext) throws JSONException {
        boolean isEnable = args.getBoolean(0);
        Security.setScreenCaptureOnMainThread(isEnable, callbackContext);
    }
}
