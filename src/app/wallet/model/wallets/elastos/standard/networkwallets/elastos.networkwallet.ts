import { ElastosWalletNetworkOptions } from "src/app/wallet/model/wallet.types";
import { StandardNetworkWallet } from "../../../standardnetworkwallet";

export abstract class ElastosStandardNetworkWallet extends StandardNetworkWallet<ElastosWalletNetworkOptions> { }