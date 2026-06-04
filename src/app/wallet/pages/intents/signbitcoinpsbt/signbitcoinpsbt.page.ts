/*
 * Copyright (c) 2024 Elastos Foundation
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
import * as BTC from 'bitcoinjs-lib';
import { bitcoin, testnet } from 'bitcoinjs-lib/src/networks';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import {
  BuiltInIcon,
  TitleBarIcon,
  TitleBarIconSlot,
  TitleBarMenuItem
} from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { TESTNET_TEMPLATE } from 'src/app/services/global.networks.service';
import { BTCSignPsbtOptions } from 'src/app/wallet/model/btc.types';
import { satsToBtc } from 'src/app/wallet/model/networks/btc/conversions';
import { WalletType } from 'src/app/wallet/model/masterwallets/wallet.types';
import { AnyNetworkWallet } from 'src/app/wallet/model/networks/base/networkwallets/networkwallet';
import { BTCSafe } from 'src/app/wallet/model/networks/btc/safes/btc.safe';
import { BTCSubWallet } from 'src/app/wallet/model/networks/btc/subwallets/btc.subwallet';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { CoinTransferService } from '../../../services/cointransfer.service';
import { Native } from '../../../services/native.service';
import { UiService } from '../../../services/ui.service';
import { WalletService } from '../../../services/wallet.service';

type SignBitcoinPsbtParam = {
  psbtHex: string;
  options?: BTCSignPsbtOptions;
};

type PsbtPreviewRow = {
  addressShort: string;
  addressFull: string;
  amountBtc: string;
  amountSats: number;
  toSign?: boolean;
};

@Component({
  selector: 'app-signbitcoinpsbt',
  templateUrl: './signbitcoinpsbt.page.html',
  styleUrls: ['./signbitcoinpsbt.page.scss']
})
export class SignBitcoinPsbtPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public isSignDataEnable = false;
  public targetNetwork: AnyNetwork = null;
  public networkWallet: AnyNetworkWallet = null;
  public btcSubWallet: BTCSubWallet = null;
  private receivedIntent: EssentialsIntentPlugin.ReceivedIntent;
  public intentParams: SignBitcoinPsbtParam = null;

  public loading = true;
  public actionIsGoing = false;

  private alreadySentIntentResponse = false;

  public currentNetworkName = '';

  public psbtInputs: PsbtPreviewRow[] = [];
  public psbtOutputs: PsbtPreviewRow[] = [];
  public psbtParseError: string | null = null;

  /** Approximate raw PSBT size from hex (2 hex chars = 1 byte). */
  public get psbtHexByteLength(): number {
    const hex = this.intentParams?.psbtHex;
    if (!hex) return 0;
    return Math.floor(hex.replace(/^0x/i, '').length / 2);
  }

  public get psbtOptionsDisplay(): string {
    if (!this.intentParams?.options) return '';
    try {
      return JSON.stringify(this.intentParams.options, null, 2);
    } catch {
      return '';
    }
  }

  /** Single-line truncated hex for summary row (full hex still copied). */
  public get psbtHexOneLine(): string {
    const h = this.intentParams?.psbtHex?.replace(/^0x/i, '') || '';
    if (h.length <= 36) return h;
    return `${h.slice(0, 12)}...${h.slice(-16)}`;
  }

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public walletManager: WalletService,
    private coinTransferService: CoinTransferService,
    private globalIntentService: GlobalIntentService,
    public native: Native,
    public zone: NgZone,
    private translate: TranslateService,
    public theme: GlobalThemeService,
    public uiService: UiService,
    private router: Router,
    public globalPopupService: GlobalPopupService,
    private prefs: GlobalPreferencesService
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation && navigation.extras && navigation.extras.state) {
      this.receivedIntent = navigation.extras.state as EssentialsIntentPlugin.ReceivedIntent;
      this.intentParams = this.receivedIntent.params.payload.params[0];
    }
  }

  ngOnInit() {
    GlobalFirebaseService.instance.logEvent('wallet_signbitcoinpsbt_enter');

    void this.init();
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('wallet.signbitcoinpsbt-title'));
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
  }

  ionViewDidEnter() {
    switch (this.networkWallet && this.networkWallet.masterWallet.type) {
      case WalletType.MULTI_SIG_EVM_GNOSIS:
      case WalletType.MULTI_SIG_STANDARD:
        void this.cancelOperation();
        break;
      default:
        break;
    }
  }

  ngOnDestroy() {
    if (!this.alreadySentIntentResponse) {
      void this.cancelOperation(false);
    }
  }

  async init() {
    this.isSignDataEnable = await this.prefs.getBitcoinSignData(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate
    );

    this.targetNetwork = WalletNetworkService.instance.getNetworkByKey('btc');

    this.currentNetworkName = this.targetNetwork.getEffectiveName();

    let masterWallet = this.walletManager.getMasterWallet(this.coinTransferService.masterWalletId);
    this.networkWallet = await this.targetNetwork.createNetworkWallet(masterWallet, false);
    if (!this.networkWallet) return;

    this.btcSubWallet = <BTCSubWallet>this.networkWallet.getMainTokenSubWallet();
    if (!this.btcSubWallet) {
      this.loading = false;
      return;
    }

    this.tryParsePsbt();
    this.loading = false;
  }

  private truncateMiddle(str: string, headChars: number, tailChars: number): string {
    if (!str) return '';
    if (str.length <= headChars + tailChars + 3) return str;
    return `${str.slice(0, headChars)}...${str.slice(-tailChars)}`;
  }

  private formatSatsAsBtc(sats: number): string {
    const fixed = satsToBtc(sats).toFixed(8);
    const trimmed = fixed.replace(/\.?0+$/, '');
    return trimmed || '0';
  }

  /**
   * `BTC.address.fromOutputScript` uses payments.p2tr(), which requires `BTC.initEccLib()` (wallet does that lazily).
   * Intent PSBT preview can run before ECC init — Taproot then fails with "has no matching Address".
   * Witness v1 + 32-byte program (BIP341 P2TR) can be encoded via `toBech32` without ECC.
   */
  private outputScriptToAddress(script: Buffer, network: BTC.Network): string {
    if (
      script &&
      script.length === 34 &&
      script[0] === 0x51 &&
      script[1] === 0x20 &&
      network?.bech32
    ) {
      try {
        return BTC.address.toBech32(script.subarray(2), 1, network.bech32);
      } catch {
        /* fall through */
      }
    }
    try {
      return BTC.address.fromOutputScript(script, network);
    } catch {
      return '(unknown)';
    }
  }

  private psbtInputAddressAndValue(psbt: BTC.Psbt, index: number, network: BTC.Network): { address: string; sats: number } {
    const input = psbt.data.inputs[index];
    if (input.witnessUtxo) {
      const address = this.outputScriptToAddress(input.witnessUtxo.script, network);
      return { address, sats: Number(input.witnessUtxo.value) };
    }
    if (input.nonWitnessUtxo && psbt.txInputs[index]) {
      const prevTx = BTC.Transaction.fromBuffer(input.nonWitnessUtxo);
      const vout = psbt.txInputs[index].index;
      const out = prevTx.outs[vout];
      if (!out) return { address: '(unknown)', sats: 0 };
      const address = this.outputScriptToAddress(out.script, network);
      return { address, sats: out.value };
    }
    return { address: '(unknown)', sats: 0 };
  }

  private tryParsePsbt(): void {
    this.psbtParseError = null;
    this.psbtInputs = [];
    this.psbtOutputs = [];
    if (!this.intentParams?.psbtHex) return;

    const btcNetwork =
      this.targetNetwork?.networkTemplate === TESTNET_TEMPLATE ? testnet : bitcoin;
    try {
      const psbt = BTC.Psbt.fromHex(this.intentParams.psbtHex.replace(/^0x/i, ''), { network: btcNetwork });
      const ourAddr = (this.getSigningWalletAddress() || '').toLowerCase();
      const rawToSign = this.intentParams.options?.toSignInputs;
      const explicitIndices =
        rawToSign && rawToSign.length > 0
          ? new Set(rawToSign.map(t => Number(t.index)).filter(n => !Number.isNaN(n)))
          : null;

      for (let i = 0; i < psbt.data.inputs.length; i++) {
        const { address, sats } = this.psbtInputAddressAndValue(psbt, i, btcNetwork);
        const toSign = explicitIndices ? explicitIndices.has(i) : address.toLowerCase() === ourAddr;
        this.psbtInputs.push({
          addressShort: this.truncateMiddle(address, 7, 6),
          addressFull: address,
          amountBtc: this.formatSatsAsBtc(sats),
          amountSats: sats,
          toSign
        });
      }

      for (let i = 0; i < psbt.txOutputs.length; i++) {
        const o = psbt.txOutputs[i];
        let address = o.address;
        if (!address && o.script) {
          address = this.outputScriptToAddress(o.script, btcNetwork);
        }
        if (!address) {
          address = '(unknown)';
        }
        this.psbtOutputs.push({
          addressShort: this.truncateMiddle(address, 7, 6),
          addressFull: address,
          amountBtc: this.formatSatsAsBtc(o.value),
          amountSats: o.value
        });
      }
    } catch (e) {
      Logger.warn('wallet', 'SignBitcoinPsbtPage tryParsePsbt:', e);
      this.psbtParseError = this.translate.instant('wallet.signbitcoinpsbt-parse-error');
    }
  }

  copyPsbtHex(): void {
    if (!this.intentParams?.psbtHex) return;
    void this.native.copyClipboard(this.intentParams.psbtHex.replace(/^0x/i, ''));
    this.native.toast(this.translate.instant('common.copied-to-clipboard'));
  }

  async signPsbt() {
    try {
      this.actionIsGoing = true;

      const signedPsbt = await (this.networkWallet.safe as unknown as BTCSafe).signPsbt(
        this.intentParams.psbtHex,
        this.intentParams.options
      );
      if (signedPsbt) {
        await this.sendIntentResponse({ signedPsbt, status: 'ok' });
      } else {
        await this.sendIntentResponse({ signedPsbt: null, status: 'error' });
      }
    } catch (e) {
      Logger.warn('wallet', 'SignBitcoinPsbtPage signPsbt error:', e);
      await this.sendIntentResponse({ signedPsbt: null, status: 'error' });
    } finally {
      this.actionIsGoing = false;
    }
  }

  async cancelOperation(navigateBack = true) {
    await this.sendIntentResponse({ signedPsbt: null, status: 'cancelled' }, navigateBack);
  }

  private async sendIntentResponse(result, navigateBack = true) {
    this.alreadySentIntentResponse = true;
    await this.globalIntentService.sendIntentResponse(result, this.receivedIntent.intentId, navigateBack);
  }

  async goTransaction() {
    await this.signPsbt();
  }

  public getSigningWalletName(): string {
    if (this.networkWallet && this.networkWallet.masterWallet) {
      return this.networkWallet.masterWallet.name;
    }
    return '';
  }

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
