import { Injectable } from '@angular/core';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { NetworkType } from '../model/networktype';

@Injectable({
    providedIn: 'root'
})
export class PrefsService {
    constructor(private prefs: GlobalPreferencesService) {}

    /**
     * Returns the currently active network such as mainnet or testnet.
     * Retrieved from elastOS' global preferences.
     */
    public async getActiveNetworkType(): Promise<NetworkType> {
        let value = await this.prefs.getPreference<string>(GlobalDIDSessionsService.signedInDIDString, "chain.network.type");
        return value as NetworkType;
    }

    public async developerModeEnabled(): Promise<boolean> {
        try {
            let devMode = await this.prefs.getPreference<boolean>(GlobalDIDSessionsService.signedInDIDString, "developer.mode");
            if (devMode)
                return true;
            else
                return false;
        }
        catch (err) {
            console.warn("developerModeEnabled() error", err);
            return false;
        }
    }
}
