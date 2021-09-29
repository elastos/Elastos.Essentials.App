import { anyswapBaseProvider } from "../../../earn/baseproviders/anyswap.provider";
import { mdexBaseProvider } from "../../../earn/baseproviders/mdex.provider";
import { o3swapBaseProvider } from "../../../earn/baseproviders/o3swap.provider";
import { SwapProvider } from "../../../earn/swapprovider";

// https://github.com/anyswap/anyswap-frontend/blob/vi-new/src/contexts/Tokens/tokens/huobi.js
export const hecoMainnetAnyswapSwapProvider = new SwapProvider(
  anyswapBaseProvider,
  true,
  [
    // TODO: How to handle "HT" ?
    "0x66a79d23e58475d2738179ca52cd0b41d73f0bea", // hBTC
    "0x64ff637fb478863b7468bc97d30a5bf3a428a1fd", // hETH
  ],
  "https://huobi.anyswap.exchange/swap?inputCurrency=${inputCurrency}&theme=${theme}"
);

export const hecoMainnetO3SwapProvider = new SwapProvider(
  o3swapBaseProvider,
  true,
  [
    "0xe36ffd17b2661eb57144ceaef942d95295e637f0", // Filda
  ],
  "https://o3swap.com/swap"
);

export const hecoMainnetMdexSwapProvider = new SwapProvider(
  mdexBaseProvider,
  true,
  // TODO: HT
  [
    "0x25d2e80cb6b86881fd7e07dd263fb79f4abe033c", // MDX
    "0x22c54ce8321a4015740ee1109d9cbc25815c46e6", // UNI
    "0x0298c2b32eae4da002a15f36fdf7615bea3da047", // HUSD
    "0xa71edc38d189767582c38a3145b5873052c3e47a", // USDT
    "0x843af718ef25708765a8e0942f89edeae1d88df0", // ADA
    "0x3d760a45d0887dfd89a2f5385a236b29cb46ed2a", // DAI
    "0x40280E26A572745B1152A54D1D44F365DaA51618", // DOGE
    "0xef3cebd77e0c52cb6f60875d9306397b5caca375", // HBCH
    "0xa2c49cee16a5e5bdefde931107dc1fae9f7773e3", // HDOT
    "0xae3a768f9ab104c69a7cd6041fe16ffa235d1810", // HFIL
    "0xecb56cf772b5c9a6907fb7d32387da2fcbfb63b4", // HLTC
    "0x9e004545c59d359f6b7bfb06a26390b087717b42", // LINK
    "0x9362bbef4b8313a8aa9f0c9808b80577aa26b73b", // USDC
    "0x5545153ccfca01fbd7dd11c0b23ba694d9509a6f", // WHT
    "0xa2f3c2446a3e20049708838a779ff8782ce6645a", // XRP
  ],
  "https://ht.mdex.co/#/swap?inputCurrency=${inputCurrency}"
);