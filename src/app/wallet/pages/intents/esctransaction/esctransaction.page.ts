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

import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BigNumber } from 'bignumber.js';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import {
  BuiltInIcon,
  TitleBarIcon,
  TitleBarIconSlot,
  TitleBarMenuItem
} from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import {
  ApproveERC20Operation,
  ETHOperationType,
  ETHTransactionInfo,
  ETHTransactionInfoParser
} from 'src/app/wallet/model/networks/evms/ethtransactioninfoparser';
import { ETHTransactionStatus } from 'src/app/wallet/model/networks/evms/evm.types';
import { AnyMainCoinEVMSubWallet } from 'src/app/wallet/model/networks/evms/subwallets/evm.subwallet';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { ERC20CoinService } from 'src/app/wallet/services/evm/erc20coin.service';
import { EVMService } from 'src/app/wallet/services/evm/evm.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { AccountAbstractionMasterWallet } from '../../../model/masterwallets/account.abstraction.masterwallet';
import { CoinTransferService, IntentTransfer } from '../../../services/cointransfer.service';
import { Native } from '../../../services/native.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';

@Component({
  selector: 'app-esctransaction',
  templateUrl: './esctransaction.page.html',
  styleUrls: ['./esctransaction.page.scss']
})
export class EscTransactionPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public targetNetwork: AnyNetwork = null;
  public networkWallet: AnyNetworkWallet = null;
  public evmSubWallet: AnyMainCoinEVMSubWallet = null;
  private intentTransfer: IntentTransfer;
  public balance: BigNumber; // ELA
  public transactionInfo: ETHTransactionInfo;

  private publicationStatusSub: Subscription;
  private ethTransactionSpeedupSub: Subscription;

  private alreadySentIntentResponse = false;

  public currentNetworkName = '';

  private intentMode = true;

  public spendingCap = '--'; // for erc20 token approve

  // Titlebar
  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public walletManager: WalletService,
    private coinTransferService: CoinTransferService,
    private globalIntentService: GlobalIntentService,
    public native: Native,
    public zone: NgZone,
    private translate: TranslateService,
    public theme: GlobalThemeService,
    private erc20service: ERC20CoinService, // Keep it to initialize the service for the ETHTransactionInfoParser
    public uiService: UiService,
    private ethTransactionService: EVMService,
    private router: Router,
    public events: GlobalEvents
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (!Util.isEmptyObject(navigation.extras.state)) {
      this.intentMode = false;
    }
  }

  ngOnInit() {
    GlobalFirebaseService.instance.logEvent('wallet_esc_transaction_enter');
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.esctransaction-title'));
    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, {
      key: 'close',
      iconPath: BuiltInIcon.CLOSE
    });
    this.titleBar.addOnItemClickedListener(
      (this.titleBarIconClickedListener = icon => {
        if (icon.key === 'close') {
          void this.cancelOperation();
        }
      })
    );

    void this.init();
  }

  ionViewDidEnter() {
    switch (this.networkWallet && this.networkWallet.masterWallet.type) {
      case WalletType.MULTI_SIG_EVM_GNOSIS:
      case WalletType.MULTI_SIG_STANDARD:
        // TODO: reject esctransaction if multi sign (show error popup)
        void this.cancelOperation();
        break;
      default:
        break;
    }
  }

  ionViewWillLeave() {
    if (this.publicationStatusSub) this.publicationStatusSub.unsubscribe();
    if (this.ethTransactionSpeedupSub) this.ethTransactionSpeedupSub.unsubscribe();
  }

  ngOnDestroy() {
    if (!this.alreadySentIntentResponse) {
      void this.cancelOperation(false);
    }
  }

  async init() {
    Logger.log(
      'wallet',
      'ESC Transaction params',
      this.coinTransferService.payloadParam,
      this.coinTransferService.masterWalletId,
      this.coinTransferService.evmChainId
    );

    // If there is a provided chain ID, use that chain id network (eg: wallet connect v2).
    // Otherwise, use the active network
    if (this.coinTransferService.evmChainId) {
      this.targetNetwork = WalletNetworkService.instance.getNetworkByChainId(this.coinTransferService.evmChainId);
    } else {
      this.targetNetwork = WalletNetworkService.instance.activeNetwork.value;
    }

    // Early return if target network is not available
    if (!this.targetNetwork) {
      Logger.warn('wallet', 'ESC Transaction: target network not found');
      return;
    }

    this.currentNetworkName = this.targetNetwork.getEffectiveName();

    this.intentTransfer = this.coinTransferService.intentTransfer;

    // Determine which network and wallet to use based on available parameters
    let targetNetwork = this.targetNetwork; // Default to target network from chain ID
    let masterWalletId = this.coinTransferService.masterWalletId;

    // If no specific master wallet ID is provided, use the active wallet's master wallet
    if (!masterWalletId) {
      let activeNetworkWallet = this.walletManager.getActiveNetworkWallet();
      if (activeNetworkWallet) {
        masterWalletId = activeNetworkWallet.masterWallet.id;
      }
    }

    // If no specific chain ID is provided, use the active network
    if (!this.coinTransferService.evmChainId) {
      targetNetwork = WalletNetworkService.instance.activeNetwork.value;
    }

    // Create network wallet with the determined network and master wallet
    if (masterWalletId) {
      let masterWallet = this.walletManager.getMasterWallet(masterWalletId);
      if (!masterWallet) {
        Logger.warn('wallet', 'ESC Transaction: master wallet not found for ID:', masterWalletId);
        return;
      }
      this.networkWallet = await targetNetwork.createNetworkWallet(masterWallet, false);
    } else {
      // Ultimate fallback to active network wallet
      let activeNetworkWallet = this.walletManager.getActiveNetworkWallet();
      if (!activeNetworkWallet) {
        Logger.warn('wallet', 'ESC Transaction: network wallet not found');
        return;
      }
      this.networkWallet = activeNetworkWallet;
    }

    this.evmSubWallet = this.networkWallet.getMainEvmSubWallet(); // Use the active network main EVM subwallet. This is ETHSC for elastos.
    if (!this.evmSubWallet) {
      Logger.warn('wallet', 'ESC Transaction: EVM subwallet not found');
      return;
    }

    await this.evmSubWallet.updateBalance();
    this.balance = await this.evmSubWallet.getDisplayBalance();

    if (this.coinTransferService.payloadParam.data) {
      // Extract information about the specific transaction type we are handling
      let transactionInfoParser = new ETHTransactionInfoParser(this.evmSubWallet.networkWallet.network);
      this.transactionInfo = await transactionInfoParser.computeFromTxData(
        this.coinTransferService.payloadParam.data,
        this.coinTransferService.payloadParam.to
      );
      if (this.transactionInfo.type === ETHOperationType.ERC20_TOKEN_APPROVE) {
        let approveOperation = <ApproveERC20Operation>this.transactionInfo.operation;
        if (approveOperation && approveOperation.spendingCap && approveOperation.decimals) {
          let tokenAmountMulipleTimes = new BigNumber(10).pow(approveOperation.decimals);
          this.spendingCap = new BigNumber(approveOperation.spendingCap).dividedBy(tokenAmountMulipleTimes).toFixed();
        }
      }
    } else {
      this.transactionInfo = {
        type: ETHOperationType.SEND_ERC20,
        operation: null,
        events: []
      };
    }
    Logger.log('wallet', 'ESCTransaction got transaction info:', this.transactionInfo);

    this.publicationStatusSub =
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      EVMService.instance.ethTransactionStatus.subscribe(async status => {
        Logger.log('wallet', 'EscTransactionPage ethTransactionStatus:', status);
        switch (status.status) {
          case ETHTransactionStatus.PACKED:
            let resultOk = {
              published: true,
              txid: status.txId,
              status: 'published'
            };
            // TODO: Wait for the ETHTransactionComponent exit.
            setTimeout(() => {
              void this.sendIntentResponse(resultOk, this.intentTransfer.intentId);
            }, 3000);
            break;
          case ETHTransactionStatus.CANCEL:
            let result = {
              published: false,
              txid: null,
              status: 'cancelled'
            };
            await this.sendIntentResponse(result, this.intentTransfer.intentId);
            break;
        }
      });

    this.ethTransactionSpeedupSub = EVMService.instance.ethTransactionSpeedup.subscribe(status => {
      Logger.log('wallet', 'EscTransactionPage ethTransactionStatus:', status);
      if (status) {
        // Forward speedup event to standard account component if needed
        this.events.publish('gasSpeedup', status);
      }
    });
  }

  /**
   * Cancel the vote operation. Closes the screen and goes back to the calling application after
   * sending the intent response.
   */
  async cancelOperation(navigateBack = true) {
    await this.sendIntentResponse({ txid: null, status: 'cancelled' }, this.intentTransfer.intentId, navigateBack);
  }

  /**
   * Shared method for sending intent responses - used by both standard and AA components
   */
  public async sendIntentResponse(result, intentId, navigateBack = true) {
    this.alreadySentIntentResponse = true;
    if (this.intentMode) {
      await this.globalIntentService.sendIntentResponse(result, intentId, navigateBack);
    } else {
      this.events.publish('esctransaction', {
        result: result
      });
      this.native.pop();
    }
  }

  public getApproveTokenNameWithSymbol(transactionInfo: ETHTransactionInfo): string {
    if (!transactionInfo)
      // Just in case
      return '';

    let approveOperation = <ApproveERC20Operation>transactionInfo.operation;
    if (approveOperation.symbol) {
      return `${approveOperation.symbol} (${approveOperation.tokenName})`;
    } else {
      return approveOperation.tokenName; // ERC721
    }
  }

  /**
   * Checks if the current master wallet is an Account Abstraction wallet
   */
  public isAccountAbstractionWallet(): boolean {
    return this.networkWallet.masterWallet instanceof AccountAbstractionMasterWallet;
  }

  /**
   * Get the coin transfer service for sub-components to access transaction data
   */
  public getCoinTransferService(): CoinTransferService {
    return this.coinTransferService;
  }

  /**
   * Get the intent transfer for sub-components
   */
  public getIntentTransfer(): IntentTransfer {
    return this.intentTransfer;
  }

  /**
   * Get the EVM subwallet for sub-components
   */
  public getEvmSubWallet(): AnyMainCoinEVMSubWallet {
    return this.evmSubWallet;
  }

  /**
   * Get the network wallet for sub-components
   */
  public getNetworkWallet(): AnyNetworkWallet {
    return this.networkWallet;
  }

  /**
   * Get the signing wallet name
   */
  public getSigningWalletName(): string {
    if (this.networkWallet && this.networkWallet.masterWallet) {
      return this.networkWallet.masterWallet.name;
    }
    return '';
  }

  /**
   * Get the signing wallet address
   */
  public getSigningWalletAddress(): string {
    if (this.networkWallet) {
      const addresses = this.networkWallet.getAddresses();
      if (addresses && addresses.length > 0) {
        return addresses[0].address;
      }
    }
    return '';
  }
}
