import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { NetworkType } from 'src/app/model/networktype';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';

@Injectable({
  providedIn: 'root'
})
export class WalletPrefsService {
  public activeNetwork: NetworkType;
  private subscription: Subscription = null;

  constructor(
    private globalPreferences: GlobalPreferencesService
  ) {}

  public async init() {
    this.activeNetwork = await this.globalPreferences.getActiveNetworkType(GlobalDIDSessionsService.signedInDIDString);

    this.subscription = this.globalPreferences.preferenceListener.subscribe((preference)=>{
      if (preference.key === "chain.network.type")
        this.activeNetwork = preference.value;
    });
  }

  public stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}
