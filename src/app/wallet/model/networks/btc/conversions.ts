import BigNumber from "bignumber.js";

export const satsPerBTC = new BigNumber("100000000");

export const btcToSats = (btc: BigNumber | string | number): BigNumber => {
  return satsPerBTC.multipliedBy(btc);
}

export const satsToBtc = (sats: BigNumber | string | number): BigNumber => {
  return new BigNumber(sats).dividedBy(satsPerBTC);
}