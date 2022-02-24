/*
 * Copyright (c) 2021 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { WalletCreator } from '../model/masterwallets/wallet.types';
import { ElastosMainChainStandardNetworkWallet } from '../model/networks/elastos/mainchain/networkwallets/standard/mainchain.networkwallet';
import { AuthService } from './auth.service';
import { WalletNetworkService } from './network.service';
import { WalletService } from './wallet.service';

export type SelectableMnemonic = {
  text: string;
  selected: boolean;
};

export enum NewWallet {
  CREATE = 1,
  IMPORT = 2,
}

@Injectable({
  providedIn: 'root'
})
export class WalletCreationService {
  // Below fields are shared by several screens while creating (new/import) a master wallet.
  // Consider this service as a singleton shared class.
  public type: NewWallet;
  public masterId: string;
  public mnemonicList: SelectableMnemonic[];
  public mnemonicStr: string;
  public singleAddress: boolean;
  public isMulti: boolean;
  public name: string;
  public mnemonicPassword: string;

  constructor(private walletService: WalletService, private authService: AuthService, private networkService: WalletNetworkService) {
    this.reset();
  }

  /**
   * Resets all service fields to their default value to restart a new wallet creation.
   */
  public reset() {
    this.type = null;
    this.masterId = null;
    this.mnemonicStr = null;
    this.mnemonicList = [];
    this.singleAddress = null;
    this.isMulti = null;
    this.name = null;

    this.mnemonicPassword = null;
  }

  /**
   * Creates a wallet that uses the same mnemonic as the DID.
   * Usually this method should be called only once per new DID created, so the newly created
   * user also has a default wallet.
   */
  public async createWalletFromNewIdentity(walletName: string, mnemonic: string, mnemonicPassphrase: string): Promise<void> {
    Logger.log("wallet", "Creating wallet from new identity");
    let masterWalletId = this.walletService.createMasterWalletID();
    const payPassword = await this.authService.createAndSaveWalletPassword(masterWalletId);
    if (payPassword) {
      try {
        // First create multi address wallet.
        await this.walletService.newWalletWithMnemonic(
          masterWalletId,
          walletName,
          mnemonic,
          mnemonicPassphrase || "",
          payPassword,
          false,
          WalletCreator.WALLET_APP
        );

        // Get the elastos network wallet instance to know if this wallet is single or multi address, as
        // we want to return this information.
        let elastosNetworkWallet = await this.networkService.getNetworkByKey("elastos").createNetworkWallet(this.walletService.getMasterWallet(masterWalletId), false) as ElastosMainChainStandardNetworkWallet;
        if (await elastosNetworkWallet.multipleAddressesInUse()) {
          await elastosNetworkWallet.startBackgroundUpdates();
          Logger.log('wallet', 'Multi address wallet!')
          return;
        }

        Logger.log('wallet', 'Single address wallet!')
        // Not multi address wallet, delete multi address wallet and create a single address wallet.
        await this.walletService.destroyMasterWallet(masterWalletId, false);
        await this.walletService.newWalletWithMnemonic(
          masterWalletId,
          walletName,
          mnemonic,
          mnemonicPassphrase || "",
          payPassword,
          true,
          WalletCreator.WALLET_APP
        );

        // Re-create the wallet again in order to initialize the subwallets again.
        elastosNetworkWallet = await this.networkService.getNetworkByKey("elastos").createNetworkWallet(this.walletService.getMasterWallet(masterWalletId), true) as ElastosMainChainStandardNetworkWallet;
      }
      catch (err) {
        Logger.error('wallet', 'Wallet import error:', err);
      }
    }
  }
}
