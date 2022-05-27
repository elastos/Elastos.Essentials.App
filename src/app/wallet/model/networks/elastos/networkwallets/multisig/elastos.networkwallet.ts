import { ElastosMainChainWalletNetworkOptions } from "src/app/wallet/model/masterwallets/wallet.types";
import { StandardMultiSigNetworkWallet } from "../../../base/networkwallets/standard.multisig.networkwallet";

export abstract class ElastosMultisigNetworkWallet extends StandardMultiSigNetworkWallet<ElastosMainChainWalletNetworkOptions> {
  public async initialize(): Promise<void> {

    // TODO: create the Wallet JS SDK multisig wallet when the sdk is ready

    /* if (!await SPVService.instance.maybeCreateStandardSPVWalletFromJSWallet(this.masterWallet))
      return;

    await super.initialize(); */
  }
}