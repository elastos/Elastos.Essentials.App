import { Native } from './native.service';
import { WalletManager } from './wallet.service';
import { Injectable } from '@angular/core';

declare let appManager: AppManagerPlugin.AppManager;

@Injectable({
    providedIn: 'root'
})
export class NavService {
    constructor(public native: Native, private walletManager: WalletManager) {
    }

    public showStartupScreen() {
        console.log("Computing and showing startup screen");

        if (this.walletManager.getWalletsCount() > 0) {
            // Go to wallet's home page.
            this.native.go("/wallet-home");
        }
        else {
            this.native.go("/launcher");
        }
    }
}
