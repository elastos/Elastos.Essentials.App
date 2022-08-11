import { elkBaseProvider } from "../../../earn/baseproviders/elk.provider";
import { EarnProvider } from "../../../earn/earnprovider";

export const bscMainnetElkEarnProvider = new EarnProvider(elkBaseProvider,
  // compound coins
  [
  ],
  // additional coins - must be lowercase
  [
    "0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c", // oELK
    "0xeeeeeb57642040be42185f49c52f7e9b38f8eeee" // ELK
  ],
  "https://app.elk.finance/#/stake"
);