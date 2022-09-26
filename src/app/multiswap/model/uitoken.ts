import BigNumber from "bignumber.js";
import { Coin } from "src/app/wallet/model/coin";

/**
 * Token used as UI model, made of a token descriptor and various UI information.
 */
export type UIToken = {
  token: Coin;
  amount: BigNumber; // Balance / Estimated balance in human readable format
}