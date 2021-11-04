import { elkBaseProvider } from "../../../earn/baseproviders/elk.provider";
import { EarnProvider } from "../../../earn/earnprovider";

export const elastosMainnetElkEarnProvider = new EarnProvider(elkBaseProvider,
  // compound coins
  [
  ],
  // additional coins - must be lowercase
  [
    "0xe1c110e1b1b4a1ded0caf3e42bfbdbb7b5d7ce1c" // ELK token itself
  ],
  "https://app.elk.finance/#/stake"
);