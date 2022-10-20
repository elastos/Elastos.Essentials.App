import { Injectable } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { Logger } from "src/app/logger";
import { Coin } from "src/app/wallet/model/coin";
import { AnyNetwork } from "src/app/wallet/model/networks/network";
import { TokenChooserComponent, TokenChooserComponentOptions, TokenChooserComponentResult } from "../components/token-chooser/token-chooser.component";
import { UIToken } from "../model/uitoken";
import { ChaingeSwapService } from "./chaingeswap.service";

@Injectable({
  providedIn: "root"
})
export class SwapUIService {
  constructor(
    private modalCtrl: ModalController,
    private chaingeSwapService: ChaingeSwapService
  ) { }

  /**
   * Opens the token chooser modal (network + token) and returns the token picked by the user.
   * This chooser can run either in "source" or "destination" modes. The content shown on UI
   * varies based on this mode.
   *
   * @param forSource Display / Selection mode
   * @param sourceToken Only for destination mode. Used by the chooser to match the pre-selected destination token with a potentially picked source token, if any
   * @returns
   */
  public async pickToken(forSource: boolean, sourceToken?: Coin): Promise<UIToken> {
    let options: TokenChooserComponentOptions = {
      mode: forSource ? "source" : "destination",
      sourceToken,
      filter: n => this.isNetworkSupported(n)
    };

    let modal = await this.modalCtrl.create({
      component: TokenChooserComponent,
      componentProps: options
    });

    return new Promise(resolve => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises, require-await
      modal.onWillDismiss().then(async (params) => {
        Logger.log('multiswap', 'Token selected:', params);
        if (params.data) {
          let result = <TokenChooserComponentResult>params.data;

          resolve(result.pickedToken);
        }
        else {
          resolve(null);
        }
      });
      void modal.present();

    });
  }

  private isNetworkSupported(network: AnyNetwork): boolean {
    let networks = this.chaingeSwapService.getSupportedNetworks();
    return !!networks.find(n => n.equals(network));
  }
}