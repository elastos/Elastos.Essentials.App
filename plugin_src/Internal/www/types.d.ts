/*
* Copyright (c) 2018-2021 Elastos Foundation
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
* declare let intentManager: IntentPlugin.IntentManager;
*/

declare namespace InternalPlugin {

    interface InternalManager {
        /**
         * Change path for compatibility.
         *
         * @param didStoreId    The didStoreId.
         * @param didString     The didString.
         */
        changeOldPath(didStoreId: string, didString: string): Promise<any>;

        /**
         * Get store data path.
         *
         * @param didStoreId    The didStoreId.
         */
        getStoreDataPath(didStoreId: string): Promise<string>;

        /**
         * Get did storage path.
         *
         * @param didStoreId    The didStoreId.
         * @param didString     The didString.
         */
        getDidStoragePath(didStoreId: string, didString: string): Promise<string>;

        /**
         * Check system whether rooted.
         */
        isDeviceRooted(): Promise<boolean>

        /**
         * Set screen capture enable or not.
         *
         * @param isEnable    enable or not.
         */
        setScreenCapture(isEnable: boolean): Promise<void>;
    }
}