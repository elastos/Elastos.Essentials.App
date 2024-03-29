
package org.elastos.essentials.plugins.internal;

import android.util.Log;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.util.ArrayList;

public class CheckRooted {
    private static String LOG_TAG = CheckRooted.class.getName();

    public static boolean isDeviceRooted() {
        if (checkDeviceDebuggable()) {
            return true;
        }
        if (isSuEnable()) {
            return true;
        }
        if (isBusyboxEnable()) {
            return true;
        }
        if (checkSuperuserApk()) {
            return true;
        }
          // if (checkRootPathSU()){return true;}//find su in some path
          // if (checkRootWhichSU()){return true;}//find su use 'which'
        if (checkBusybox()) {
            return true;
        }
        if (checkAccessRootData()) {
            return true;
        }
//        if (checkGetRootAuth()) {
//            return true;
//        }

        return false;
    }

    public static boolean checkDeviceDebuggable() {
        String buildTags = android.os.Build.TAGS;
        if (buildTags != null && buildTags.contains("test-keys")) {
            Log.i(LOG_TAG, "buildTags=" + buildTags);
            return true;
        }
        return false;
    }

    public static boolean isCommandEnable(String command) {
        File file = null;
        String[] paths = {"/system/bin/", "/system/xbin/", "/system/sbin/", "/sbin/",
                "/vendor/bin/", "/su/bin/", "/system/sd/xbin/", "/system/bin/failsafe/",
                "/data/local/xbin/", "/data/local/bin/", "/data/local/"};
        try {
            for (String path : paths) {
                file = new File(path + command);
                if (file.exists() && file.canExecute()) {
                    Log.i(LOG_TAG, "find su in : " + path);
                    return true;
                }
            }
        } catch (Exception x) {
            x.printStackTrace();
        }
        return false;
    }

    public static boolean isSuEnable() {
        return isCommandEnable("su");
    }

    public static boolean isBusyboxEnable() {
        return isCommandEnable("busybox");
    }

    public static boolean checkSuperuserApk() {
        try {
            File file = new File("/system/app/Superuser.apk");
            if (file.exists()) {
                Log.i(LOG_TAG, "/system/app/Superuser.apk exist");
                return true;
            }
        }
        catch (Exception e) {
        }
        return false;
    }

    public static synchronized boolean checkGetRootAuth() {
        Process process = null;
        DataOutputStream os = null;
        try {
            Log.i(LOG_TAG, "to exec su");
            process = Runtime.getRuntime().exec("su");
            os = new DataOutputStream(process.getOutputStream());
            os.writeBytes("exit\n");
            os.flush();
            int exitValue = process.waitFor();
            Log.i(LOG_TAG, "exitValue=" + exitValue);
            if (exitValue == 0) {
                return true;
            }
            else {
                return false;
            }
        }
        catch (Exception e) {
            Log.i(LOG_TAG, "Unexpected error - Here is what I know: "
                    + e.getMessage());
            return false;
        }
        finally {
            try {
                if (os != null) {
                    os.close();
                }
                process.destroy();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public static synchronized boolean checkBusybox() {
        try {
            Log.i(LOG_TAG, "to exec busybox df");
            String[] strCmd = new String[] { "busybox", "df" };
            ArrayList<String> execResult = executeCommand(strCmd);
            if (execResult != null) {
                Log.i(LOG_TAG, "execResult=" + execResult.toString());
                return true;
            }
            else {
                Log.i(LOG_TAG, "execResult=null");
                return false;
            }
        }
        catch (Exception e) {
            Log.i(LOG_TAG, "Unexpected error - Here is what I know: "
                    + e.getMessage());
            return false;
        }
    }

    public static ArrayList<String> executeCommand(String[] shellCmd) {
        String line = null;
        ArrayList<String> fullResponse = new ArrayList<String>();
        Process localProcess = null;
        try {
            Log.i(LOG_TAG, "to shell exec which for find su :");
            localProcess = Runtime.getRuntime().exec(shellCmd);
        } catch (Exception e) {
            return null;
        }
        BufferedWriter out = new BufferedWriter(new OutputStreamWriter(localProcess.getOutputStream()));
        BufferedReader in = new BufferedReader(new InputStreamReader(localProcess.getInputStream()));
        try {
            while ((line = in.readLine()) != null) {
                Log.i(LOG_TAG, "–> Line received: " + line);
                fullResponse.add(line);
            }
        }
        catch (Exception e) {
            e.printStackTrace();
        }
        Log.i(LOG_TAG, "–> Full response was: " + fullResponse);
        return fullResponse;
    }

    public static synchronized boolean checkAccessRootData() {
        try {
            Log.i(LOG_TAG, "to write /data");
            String fileContent = "test_ok";
            Boolean writeFlag = writeFile("/data/su_test", fileContent);
            if (writeFlag) {
                Log.i(LOG_TAG, "write ok");
            }
            else {
                Log.i(LOG_TAG, "write failed");
            }

            Log.i(LOG_TAG, "to read /data");
            String strRead = readFile("/data/su_test");
            Log.i(LOG_TAG, "strRead=" + strRead);
            if (fileContent.equals(strRead)) {
                return true;
            }
            else {
                return false;
            }
        }
        catch (Exception e) {
            Log.i(LOG_TAG, "Unexpected error - Here is what I know: "
                    + e.getMessage());
            return false;
        }
    }

    public static Boolean writeFile(String fileName, String message) {
        try {
            FileOutputStream fout = new FileOutputStream(fileName);
            byte[] bytes = message.getBytes();
            fout.write(bytes);
            fout.close();
            return true;
        }
        catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public static String readFile(String fileName) {
        File file = new File(fileName);
        try {
            FileInputStream fis = new FileInputStream(file);
            byte[] bytes = new byte[1024];
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            int len;
            while ((len = fis.read(bytes)) > 0) {
                bos.write(bytes, 0, len);
            }
            String result = new String(bos.toByteArray());
            Log.i(LOG_TAG, result);
            return result;
        }
        catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}