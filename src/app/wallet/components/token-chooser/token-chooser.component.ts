import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { AnySubWallet } from 'src/app/wallet/model/networks/base/subwallets/subwallet';
import { ERC20SubWallet } from 'src/app/wallet/model/networks/evms/subwallets/erc20.subwallet';
import { MainCoinEVMSubWallet } from 'src/app/wallet/model/networks/evms/subwallets/evm.subwallet';
import { AnyNetwork } from 'src/app/wallet/model/networks/network';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { UiService } from '../../services/ui.service';

// eslint-disable-next-line @typescript-eslint/ban-types
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
  public activeNetwork: AnyNetwork = null;
  private nativeTokenWallet: MainCoinEVMSubWallet<any> = null;
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
