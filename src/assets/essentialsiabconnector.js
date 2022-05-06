(function (factory) {
    typeof define === 'function' && define.amd ? define(factory) :
    factory();
})((function () { 'use strict';

    class Context {
    }
    const context = new Context();

    class EssentialsBridge {
        constructor() {
            this.callbacks = new Map();
        }
        /**
         * Internal js -> native message handler.
         *
         * Returns a promise that is resolved when the native code (essentials) sends the command
         * response.
         */
        postMessage(handler, data) {
            let id = Date.now() + Math.floor(Math.random() * 100000);
            console.log("EssentialsBridge: postMessage", handler, id, data);
            return new Promise((resolve, reject) => {
                this.callbacks.set(id, { resolve, reject });
                let object = {
                    id: id,
                    name: handler,
                    object: data,
                };
                window.webkit.messageHandlers.essentialsExtractor.postMessage(JSON.stringify(object));
            });
        }
        /**
         * Internal native result -> js
         */
        sendResponse(id, result) {
            console.log("EssentialsBridge: sendResponse", id, result);
            this.callbacks.get(id).resolve(result);
        }
        /**
        * Internal native error -> js
        */
        sendError(id, error) {
            console.log("EssentialsBridge: sendError", id, error);
            let callback = this.callbacks.get(id);
            if (callback) {
                this.callbacks.get(id).reject(error);
                this.callbacks.delete(id);
            }
        }
    }
    const essentialsBridge = new EssentialsBridge();

    /**
     * IMPORTANT NOTE: This internal essentials connector must NOT use the DID JS SDK and Connectivity SDK
     * classes directly because otherwise this conflicst with those SDKs imported by the running apps. If
     * multiple versions of those SDKs are in use in the same webview, webpack loader mixes SDK classes in a wrong
     * way, and type checks such as "myVar instanceof DID" sometimes works, sometimes doesn't, because there are
     * multiple versions of the "DID" class that are actually not "the same".
     *
     * So the trick to access DID SDK and Connectivity SDK methods here is to make the connectivity SDK provide
     * references to those modules, loaded from the main app bundle, and use them in this connector without bundling
     * anything.
     */
    class DIDOperations {
        static async getCredentials(query) {
            console.log("getCredentials request received", query);
            let response = await essentialsBridge.postMessage("elastos_getCredentials", query);
            console.log("getCredentials response received", response);
            return context.didSdk.VerifiablePresentation.parse(JSON.stringify(response));
        }
        static async requestCredentials(request) {
            console.log("requestCredentials request received", request);
            let response = await this.postEssentialsUrlIntent("https://did.elastos.net/requestcredentials", {
                request
            });
            console.log("requestCredentials response received", response);
            return context.didSdk.VerifiablePresentation.parse(response.presentation);
        }
        static async importCredentials(credentials, options) {
            console.log("importCredentials request received", credentials, options);
            let query = {
                credentials: credentials.map(c => JSON.parse(c.toString()))
            };
            if (options && options.forceToPublishCredentials)
                query["forceToPublishCredentials"] = true;
            let response = await this.postEssentialsUrlIntent("https://did.elastos.net/credimport", query);
            let importedCredentials;
            importedCredentials = response.importedcredentials.map(credentialUrl => {
                return {
                    id: context.didSdk.DIDURL.from(credentialUrl)
                };
            });
            console.log("importCredentials response received", response);
            return importedCredentials;
        }
        static async signData(data, jwtExtra, signatureFieldName) {
            console.log("signData request received", data, jwtExtra, signatureFieldName);
            let response = await essentialsBridge.postMessage("elastos_signData", {
                data, jwtExtra, signatureFieldName
            });
            console.log("signData response received", response);
            return response;
        }
        static async deleteCredentials(credentialIds, options) {
            console.log("deleteCredentials request received", credentialIds, options);
            let response = await this.postEssentialsUrlIntent("https://did.elastos.net/creddelete", {
                credentialsids: credentialIds,
                options
            });
            console.log("deleteCredentials response received", response);
            if (!response || !response.deletedcredentialsids) {
                return null;
            }
            return response.deletedcredentialsids;
        }
        static async generateAppIdCredential(appInstanceDID, appDID) {
            console.log("generateAppIdCredential request received", appInstanceDID, appDID);
            let response = await this.postEssentialsUrlIntent("https://did.elastos.net/appidcredissue", {
                appinstancedid: appInstanceDID,
                appdid: appDID
            });
            console.log("generateAppIdCredential response received", response);
            if (!response || !response.credential) {
                return null;
            }
            return context.didSdk.VerifiableCredential.parse(response.credential);
        }
        static async updateHiveVaultAddress(vaultAddress, displayName) {
            console.log("updateHiveVaultAddress request received", vaultAddress, displayName);
            let response = await this.postEssentialsUrlIntent("https://did.elastos.net/sethiveprovider", {
                address: vaultAddress,
                name: displayName
            });
            console.log("updateHiveVaultAddress response received", response);
            if (!response || !response.status) {
                return null;
            }
            return response.status;
        }
        static async issueCredential(holder, types, subject, identifier, expirationDate) {
            console.log("issueCredential request received", holder, types, subject, identifier, expirationDate);
            let response = await this.postEssentialsUrlIntent("https://did.elastos.net/credissue", {
                subjectdid: holder,
                types,
                properties: subject,
                identifier,
                expirationDate
            });
            console.log("issueCredential response received", response);
            if (!response || !response.credential) {
                return null;
            }
            return context.didSdk.VerifiableCredential.parse(response.credential);
        }
        static async generateHiveBackupCredential(sourceHiveNodeDID, targetHiveNodeDID, targetNodeURL) {
            console.log("generateHiveBackupCredential request received", sourceHiveNodeDID, targetHiveNodeDID, targetNodeURL);
            let response = await this.postEssentialsUrlIntent("https://did.elastos.net/hivebackupcredissue", {
                sourceHiveNodeDID,
                targetHiveNodeDID,
                targetNodeURL
            });
            console.log("generateHiveBackupCredential response received", response);
            if (!response || !response.credential) {
                return null;
            }
            return context.didSdk.VerifiableCredential.parse(response.credential);
        }
        static async postEssentialsUrlIntent(url, params) {
            // Append informative caller information to the intent, if available.
            // getApplicationDID() throws an error if called when no app did has been set.
            try {
                params["caller"] = context.connectivity.getApplicationDID();
            }
            catch {
                // Silent catch, it's ok
            }
            return essentialsBridge.postMessage("elastos_essentials_url_intent", {
                url,
                params
            });
        }
    }

    /**
     * Connector generated as a standalone JS file that can be injected into dApps opened from the
     * Essentials dApp browser. This connector is normally injected as a global window.elastos and can then
     * be found by the connectivity SDK as one of the available connectors for elastos operations.
     */
    class EssentialsDABConnector /* implements Interfaces.Connectors.IConnector */ {
        constructor() {
            this.name = "essentialsiab";
        }
        async getDisplayName() {
            return "Elastos Essentials In App Browser";
        }
        getWeb3Provider() {
            // As we are running inside essentials, the web3 provider is injeted
            // into window.ethereum
            return window.ethereum;
        }
        async setModuleContext(didSdkModule, connectivityModule) {
            context.didSdk = didSdkModule;
            context.connectivity = connectivityModule;
        }
        ensureContextSet() {
            if (!context.didSdk || !context.connectivity) {
                throw new Error("This dApp uses a old version of the elastos connectivity SDK and must be upgraded to be able to run inside Elastos Essentials");
            }
        }
        /**
         * DID API
         */
        getCredentials(query) {
            this.ensureContextSet();
            return DIDOperations.getCredentials(query);
        }
        requestCredentials(query) {
            this.ensureContextSet();
            return DIDOperations.requestCredentials(query);
        }
        issueCredential(holder, types, subject, identifier, expirationDate) {
            this.ensureContextSet();
            return DIDOperations.issueCredential(holder, types, subject, identifier, expirationDate);
        }
        importCredentials(credentials, options) {
            this.ensureContextSet();
            return DIDOperations.importCredentials(credentials, options);
        }
        signData(data, jwtExtra, signatureFieldName) {
            this.ensureContextSet();
            return DIDOperations.signData(data, jwtExtra, signatureFieldName);
        }
        deleteCredentials(credentialIds, options) {
            this.ensureContextSet();
            return DIDOperations.deleteCredentials(credentialIds, options);
        }
        requestPublish() {
            // OK. Normally never used, could become deprecated soon, we don't implement for now.
            throw new Error("Method not implemented.");
        }
        generateAppIdCredential(appInstanceDID, appDID) {
            this.ensureContextSet();
            return DIDOperations.generateAppIdCredential(appInstanceDID, appDID);
        }
        updateHiveVaultAddress(vaultAddress, displayName) {
            this.ensureContextSet();
            return DIDOperations.updateHiveVaultAddress(vaultAddress, displayName);
        }
        importCredentialContext(serviceName, contextCredential) {
            // Ok for now, only used by the credential toolbox, not supposed to be used on mobile.
            throw new Error("importCredentialContext(): Method not implemented.");
        }
        generateHiveBackupCredential(sourceHiveNodeDID, targetHiveNodeDID, targetNodeURL) {
            this.ensureContextSet();
            return DIDOperations.generateHiveBackupCredential(sourceHiveNodeDID, targetHiveNodeDID, targetNodeURL);
        }
        pay(query) {
            throw new Error("Method not implemented.");
        }
        voteForDPoS() {
            throw new Error("Method not implemented.");
        }
        voteForCRCouncil() {
            throw new Error("Method not implemented.");
        }
        voteForCRProposal() {
            throw new Error("Method not implemented.");
        }
        sendSmartContractTransaction(payload) {
            throw new Error("Method not implemented.");
        }
        sendResponse(id, result) {
            essentialsBridge.sendResponse(id, result);
        }
        sendError(id, error) {
            essentialsBridge.sendError(id, error);
        }
    }
    // Expose this class globally to be able to create instances from the browser dApp.
    window["EssentialsDABConnector"] = EssentialsDABConnector;

}));
//# sourceMappingURL=essentialsiabconnector.js.map
