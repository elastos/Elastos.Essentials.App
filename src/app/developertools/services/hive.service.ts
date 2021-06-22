import { Injectable } from '@angular/core';
import { ElastosSDKHelper } from 'src/app/helpers/elastossdk.helper';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';

@Injectable({
    providedIn: 'root'
})
export class HiveService {
    private hiveClient: HivePlugin.Client;

    constructor(private storage: GlobalStorageService) {}

    public async getHiveClient(): Promise<HivePlugin.Client> {
        if (this.hiveClient)
            return this.hiveClient;

        let hiveAuthHelper = new ElastosSDKHelper().newHiveAuthHelper();
        if (hiveAuthHelper) {
            this.hiveClient = await hiveAuthHelper.getClientWithAuth((e)=>{
                // Auth error
                Logger.error("developertools", "Authentication error", e); // TODO: inform user.
            });
        }
        return this.hiveClient;
    }

    public async getDeveloperVault(): Promise<HivePlugin.Vault> {
        let signedInUserDID = GlobalDIDSessionsService.signedInDIDString;
        return await (await this.getHiveClient()).getVault(signedInUserDID);
    }

    public async getTrinityTechVault(): Promise<HivePlugin.Vault> {
        return await (await this.getHiveClient()).getVault("did:elastos:iXyYFboFAd2d9VmfqSvppqg1XQxBtX9ea2");
    }
}
