import { elkBaseProvider } from "../../../earn/baseproviders/elk.provider";
import { SwapProvider } from "../../../earn/swapprovider";

export const avalancheMainnetElkSwapProvider = new SwapProvider(
  elkBaseProvider,
  true,
  [],
  [
    "https://raw.githubusercontent.com/elkfinance/tokens/main/avax.tokenlist.json"
  ],
  "https://app.elk.finance/#/swap?inputCurrency=${inputCurrency}"
);