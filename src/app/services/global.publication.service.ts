import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { DIDPublishingComponent } from '../components/did-publishing/did-publishing.component';
import { Logger } from '../logger';
import { JSONObject } from '../model/json';
import { GlobalDIDSessionsService } from './global.didsessions.service';
import { GlobalIntentService } from './global.intent.service';
import { GlobalJsonRPCService } from './global.jsonrpc.service';
import { GlobalNativeService } from './global.native.service';
import { GlobalNetworksService } from './global.networks.service';
import { GlobalPreferencesService } from './global.preferences.service';
import { GlobalStorageService } from './global.storage.service';
import { GlobalSwitchNetworkService } from './global.switchnetwork.service';
import { GlobalThemeService } from './global.theme.service';
import { AssistPublishing } from './publication/assist.publisher';
import { DIDPublisher } from './publication/didpublisher';
import { WalletPublishing } from './publication/wallet.publisher';

declare let didManager: DIDPlugin.DIDManager;

export type PersistentInfo = {
    did: {
        didString: string;
        publicationMedium: string, // assist, wallet
        publicationStatus: DIDPublicationStatus,

        assist?: {
            publicationID: string; // Unique publication ID returned by the assist API after a successful publication request. This is NOT a blockchain transaction ID.
            txId?: string; // After publishing a DID request to assist we save the returned txid here.
        },
        wallet?: {
            txId?: string; // After publishing a DID request to the EID chain we save the txid here.
            publicationTime?: number; // Unix timestamp seconds
        }
    },
}

export const enum DIDPublicationStatus {
    NO_ON_GOING_PUBLICATION = 0, // Initial state just before a publication is sent.
    AWAITING_PUBLICATION_CONFIRMATION = 1, // Publication sent, waiting for confirmation from the service/chain.
    PUBLISHED_AND_CONFIRMED = 2, // Previously published transaction was published and confirmed on chain.
    FAILED_TO_PUBLISH = 3
}

export type PublicationStatus = {
    didString: string;
    status: DIDPublicationStatus;
    txId?: string;
}

export class DIDPublishingManager {
    public persistentInfo: PersistentInfo = null;

    private assistPublisher: AssistPublishing.AssistPublisher = null;
    private walletPublisher: WalletPublishing.WalletPublisher = null;
    private activePublisher: DIDPublisher = null;

    constructor(
        private publicationService: GlobalPublicationService,
        private http: HttpClient,
        private jsonRPC: GlobalJsonRPCService,
        private storage: GlobalStorageService,
        private theme: GlobalThemeService,
        private modalCtrl: ModalController,
        private prefs: GlobalPreferencesService,
        private globalNetworksService: GlobalNetworksService,
        private globalIntentService: GlobalIntentService,
        private globalSwitchNetworkService: GlobalSwitchNetworkService) { }

    public async init(): Promise<void> {
        this.persistentInfo = await this.loadPersistentInfo();

        this.assistPublisher = new AssistPublishing.AssistPublisher(
            this,
            this.http,
            this.theme,
            this.modalCtrl,
            this.storage,
            this.globalNetworksService);

        this.walletPublisher = new WalletPublishing.WalletPublisher(
            this,
            this.jsonRPC,
            this.globalIntentService,
            this.globalSwitchNetworkService
        );

        await this.assistPublisher.init();
        await this.walletPublisher.init();
    }

    private async loadPersistentInfo(): Promise<PersistentInfo> {
        let infoAsString = await this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, 'publicationservice', "persistentInfo", null);
        if (!infoAsString)
            return this.createNewPersistentInfo();

        return JSON.parse(infoAsString);
    }

    public createNewPersistentInfo(): PersistentInfo {
        return {
            did: {
                didString: null,
                publicationMedium: null,
                publicationStatus: DIDPublicationStatus.NO_ON_GOING_PUBLICATION,
                assist: {
                    publicationID: null
                }
            }
        }
    }

    public async savePersistentInfo(persistentInfo: PersistentInfo) {
        this.persistentInfo = persistentInfo;
        await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, 'publicationservice', "persistentInfo", JSON.stringify(persistentInfo));
    }

    public async savePersistentInfoAndEmitStatus(persistentInfo: PersistentInfo) {
        //console.log("DEBUG savePersistentInfoAndEmitStatus", persistentInfo);
        await this.savePersistentInfo(persistentInfo);
        this.emitPublicationStatusChangeFromPersistentInfo();
    }

    /**
    * Emit a public publication status event that matches the current persistent info state.
    */
    public emitPublicationStatusChangeFromPersistentInfo() {
        //console.log("DEBUG emitPublicationStatusChangeFromPersistentInfo", this.persistentInfo);

        let txId: string;
        if (this.persistentInfo.did.assist && this.persistentInfo.did.assist.txId)
            txId = this.persistentInfo.did.assist.txId;
        else if (this.persistentInfo.did.wallet && this.persistentInfo.did.wallet.txId)
            txId = this.persistentInfo.did.wallet.txId;

        this.publicationService.publicationStatus.next({
            didString: this.persistentInfo.did.didString,
            status: this.persistentInfo.did.publicationStatus,
            txId: txId || null
        });
    }

    public async resetStatus() {
        if (this.activePublisher)
            await this.activePublisher.resetStatus();

        this.persistentInfo = this.createNewPersistentInfo();
        await this.savePersistentInfoAndEmitStatus(this.persistentInfo);
    }

    /**
     * Returns the medium (assist, wallet) that we should use to publish
     */
    private async getPublishingMedium(): Promise<string> {
        if (!GlobalDIDSessionsService.signedInDIDString)
            return 'assist'; // No signed in user? We may be in a DID creation flow. Anyway, use assist in this case.

        return await this.prefs.getPublishIdentityMedium(GlobalDIDSessionsService.signedInDIDString);
    }

    public async publishDIDFromRequest(didString: string, payloadObject: JSONObject, memo: string, showBlockingLoader = false): Promise<void> {
        let publishMedium = await this.getPublishingMedium();
        if (publishMedium === 'assist')
            this.activePublisher = this.assistPublisher;
        else
            this.activePublisher = this.walletPublisher;

        return this.activePublisher.publishDID(didString, payloadObject, memo, showBlockingLoader);
    }

    /**
     * Shows a blocking modal that shows the publication progress on assist.
     */
    public async displayPublicationLoader(): Promise<void> {
        const modal = await this.modalCtrl.create({
            component: DIDPublishingComponent,
            componentProps: {},
            backdropDismiss: false, // Not closeable
            cssClass: !this.theme.darkMode ? "identity-showqrcode-component identity-publishmode-component-base" : 'identity-showqrcode-component-dark identity-publishmode-component-base'
        });

        void modal.onDidDismiss().then((params) => {
            //
        });

        void modal.present();
    }
}

@Injectable({
    providedIn: 'root'
})
export class GlobalPublicationService {
    public static instance: GlobalPublicationService = null;

    private manager: DIDPublishingManager = null;

    public publicationStatus: Subject<PublicationStatus> = null;

    constructor(
        private storage: GlobalStorageService,
        private http: HttpClient,
        private jsonRPC: GlobalJsonRPCService,
        private modalCtrl: ModalController,
        private theme: GlobalThemeService,
        private prefs: GlobalPreferencesService,
        private globalNetworksService: GlobalNetworksService,
        private globalIntentService: GlobalIntentService,
        private globalNativeService: GlobalNativeService,
        private globalSwitchNetworkService: GlobalSwitchNetworkService
    ) {
        GlobalPublicationService.instance = this;

        this.manager = new DIDPublishingManager(
            this,
            this.http,
            this.jsonRPC,
            this.storage,
            this.theme,
            this.modalCtrl,
            this.prefs,
            this.globalNetworksService,
            this.globalIntentService,
            this.globalSwitchNetworkService);
    }

    public async init(): Promise<void> {
        await this.manager.init();
        this.publicationStatus = new Subject<PublicationStatus>();
    }


    /**
     * Publish the given DID Request.
     */
    public publishDIDFromRequest(didString: string, payloadObject: JSONObject, memo: string, showBlockingLoader = false): Promise<void> {
        return this.manager.publishDIDFromRequest(didString, payloadObject, memo, showBlockingLoader);
    }

    /**
     * Opens a DID store, generates a DID request and publish it.
     */
    public publishDIDFromStore(storeId: string, storePass: string, didString: string, showBlockingLoader = false): Promise<void> {
        Logger.log("publicationservice", "Starting the DID publication process");

        // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
        return new Promise<void>(async (resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
            const didStore = await this.openDidStore(storeId, async (payload: string, memo: string) => {
                // Callback called by the DID SDK when trying to publish a DID.
                Logger.log("publicationservice", "Create ID transaction callback is being called", payload, memo);
                const payloadAsJson = JSON.parse(payload);
                // TODO: Identiy will showLoading when publish did. we can improve it.
                await this.globalNativeService.hideLoading();
                await this.publishDIDFromRequest(didString, payloadAsJson, memo, showBlockingLoader);
                resolve();
            });

            const localDIDDocument = await this.loadLocalDIDDocument(didStore, didString);
            if (localDIDDocument) {
                // Start the publication flow
                localDIDDocument.publish(storePass, () => { }, (err) => {
                    // Local "publish" process errored
                    Logger.log("publicationservice", "Local DID Document publish(): error", err);
                    reject(err);
                });
            }
            else {
                // Weird, the DID we've just created could not be loaded... Let user know anyway
                reject("Failed to load DID document for DID " + didString + " in store id " + didStore.getId());
            }
        });
    }

    public resetStatus(): Promise<void> {
        return this.manager.resetStatus();
    }

    private openDidStore(storeId: string, createIdTransactionCallback: DIDPlugin.OnCreateIdTransaction): Promise<DIDPlugin.DIDStore> {
        return new Promise((resolve) => {
            didManager.initDidStore(storeId, createIdTransactionCallback, (didstore) => {
                resolve(didstore);
            }, (err) => {
                resolve(null);
            });
        });
    }

    private loadLocalDIDDocument(didStore: DIDPlugin.DIDStore, didString: string): Promise<DIDPlugin.DIDDocument> {
        return new Promise((resolve) => {
            didStore.loadDidDocument(didString, (didDocument) => {
                resolve(didDocument);
            }, (err) => {
                resolve(null);
            });
        });
    }
}