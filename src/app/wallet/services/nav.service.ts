import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { Native } from './native.service';
import { WalletService } from './wallet.service';

@Injectable({
    providedIn: 'root'
})
export class NavService {
    constructor(public native: Native, private walletManager: WalletService) {
    }

    public showStartupScreen() {
        Logger.log("wallet", "Computing and showing startup screen");

        // Number of wallets supported by the current network
        if (this.walletManager.getNetworkWalletsList().length > 0) {
            // Go to wallet's home page.
            this.native.go("/wallet/wallet-home");
        }
        else {
            this.native.go("/wallet/settings", {
                createWallet: true
            });
        }
    }
}
