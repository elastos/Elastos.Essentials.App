import { Injectable } from '@angular/core';
import { VaultServices } from '@elastosfoundation/elastos-hive-js-sdk';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';

@Injectable({
    providedIn: 'root'
})
export class HiveService implements GlobalService {
    private developerVaultServices: VaultServices;
    private ttechVaultServices: VaultServices;

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

    public async getDeveloperVault(): Promise<VaultServices> {
        let signedInUserDID = GlobalDIDSessionsService.signedInDIDString;

        if (!this.developerVaultServices)
            this.developerVaultServices = await this.globalHiveService.getVaultServicesFor(signedInUserDID);

        return this.developerVaultServices;
    }

    public async getTrinityTechVault(): Promise<VaultServices> {
        if (!this.ttechVaultServices)
            this.ttechVaultServices = await this.globalHiveService.getVaultServicesFor("did:elastos:iXyYFboFAd2d9VmfqSvppqg1XQxBtX9ea2");

        return this.ttechVaultServices;
    }
}
