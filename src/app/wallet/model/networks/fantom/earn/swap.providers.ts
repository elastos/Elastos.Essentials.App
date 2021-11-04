import { elkBaseProvider } from "../../../earn/baseproviders/elk.provider";
import { SwapProvider } from "../../../earn/swapprovider";

export const fantomMainnetElkSwapProvider = new SwapProvider(
  elkBaseProvider,
  true,
  [],
  [
    "https://raw.githubusercontent.com/elkfinance/tokens/main/ftm.tokenlist.json"
  ],
  "https://app.elk.finance/#/swap?inputCurrency=${inputCurrency}"
);