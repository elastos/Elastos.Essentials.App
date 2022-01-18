import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Network } from 'src/app/wallet/model/networks/network';
import { ERC20SubWallet } from 'src/app/wallet/model/wallets/erc20.subwallet';
import { StandardEVMSubWallet } from 'src/app/wallet/model/wallets/evm.subwallet';
import { AnySubWallet } from 'src/app/wallet/model/wallets/subwallet';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { UiService } from '../../services/ui.service';

export type TokenChooserComponentOptions = {
}

type TokenToShow = {
  type: "native" | "erc20";
  subWallet: AnySubWallet;
}

/**
 * NOTE: Currently, only used to pick the main EVM token + ERC20 tokens for red packets.
 * To be improved!
 */
@Component({
  selector: 'app-token-chooser',
  templateUrl: './token-chooser.component.html',
  styleUrls: ['./token-chooser.component.scss'],
})
export class TokenChooserComponent implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public activeNetwork: Network = null;
  private nativeTokenWallet: StandardEVMSubWallet = null;
  public tokens: TokenToShow[] = [];

  constructor(
    private navParams: NavParams,
    private networkService: WalletNetworkService,
    private walletService: WalletService,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    public uiService: UiService,
    private modalCtrl: ModalController
  ) {
  }

  ngOnInit() {
    this.activeNetwork = this.networkService.activeNetwork.value;

    let activeNetworkWallet = this.walletService.activeNetworkWallet.value;

    // For now, this service works only on EVM networks, so getMainEvmSubWallet() must always be valid.
    this.nativeTokenWallet = activeNetworkWallet.getMainEvmSubWallet();

    // Prepare the native token
    this.tokens = [{
      type: "native",
      subWallet: this.nativeTokenWallet
    }];

    // Prepare ERC20 tokens
    let erc20Tokens = activeNetworkWallet.getSubWallets().filter(sw =>
      sw.shouldShowOnHomeScreen() && sw instanceof ERC20SubWallet
    ).map(sw => {
      return {
        type: "erc20",
        subWallet: sw
      } as TokenToShow
    });
    this.tokens = [...this.tokens, ...erc20Tokens];
  }

  public selectToken(token: TokenToShow) {
    Logger.log("redpackets", "Token selected", token);

    void this.modalCtrl.dismiss({
      selectedSubwallet: token.subWallet
    });
  }

  cancelOperation() {
    Logger.log("redpackets", "Token selection cancelled");
    void this.modalCtrl.dismiss();
  }
}
