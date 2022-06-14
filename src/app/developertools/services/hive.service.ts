import { Injectable } from '@angular/core';
import { Vault } from '@elastosfoundation/hive-js-sdk';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { } from 'src/app/services/global.didsessions.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { DIDSessionsStore } from './../../services/stores/didsessions.store';

@Injectable({
    providedIn: 'root'
})
export class HiveService implements GlobalService {
    private developerVaultServices: Vault;
    private ttechVaultServices: Vault;

    constructor(private globalHiveService: GlobalHiveService) {
        GlobalServiceManager.getInstance().registerService(this);
    }

    onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
        return;
    }

    onUserSignOut(): Promise<void> {
        // On sign out, forget the current vault services to allow them to recreate for next user.
        this.developerVaultServices = null;
        return;
    }

    public async getDeveloperVault(): Promise<Vault> {
        let signedInUserDID = DIDSessionsStore.signedInDIDString;

        if (!this.developerVaultServices)
            this.developerVaultServices = await this.globalHiveService.getVaultServicesFor(signedInUserDID);

        return this.developerVaultServices;
    }

    public async getTrinityTechVault(): Promise<Vault> {
        if (!this.ttechVaultServices)
            this.ttechVaultServices = await this.globalHiveService.getVaultServicesFor("did:elastos:iXyYFboFAd2d9VmfqSvppqg1XQxBtX9ea2");

        return this.ttechVaultServices;
    }
}
