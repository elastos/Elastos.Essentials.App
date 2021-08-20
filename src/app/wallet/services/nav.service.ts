import { Native } from './native.service';
import { WalletManager } from './wallet.service';
import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';


@Injectable({
    providedIn: 'root'
})
export class NavService {
    constructor(public native: Native, private walletManager: WalletManager, private splashScreen: SplashScreen) {
    }

    public showStartupScreen() {
        Logger.log("wallet", "Computing and showing startup screen");

        if (this.walletManager.getWalletsCount() > 0) {
            // Go to wallet's home page.
            this.native.go("/wallet/wallet-home");
        }
        else {
            this.native.go("/wallet/launcher");
        }
    }
}
