import { mdexBaseProvider } from "../../../earn/baseproviders/mdex.provider";
import { SwapProvider } from "../../../earn/swapprovider";

export const bscMainnetMdexSwapProvider = new SwapProvider(
  mdexBaseProvider,
  true,
  // TODO: BNB
  [
    "0xe9e7cea3dedca5984780bafc599bd69add087d56", // BUSD
    "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", // BTCB
    "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", // USDC
    "0x2170ed0880ac9a755fd29b2688956bd959f933f8", // ETH
    "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47", // ADA
    "0x8ff795a6f4d97e7887c79bea79aba5cc76444adf", // BCH
    "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", // CAKE
    "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3", // DAI
    "0xba2ae424d960c26247dd6c32edc70b295c744c43", // DOGE
    "0x7083609fce4d1d8dc0c979aab8c869ea2c873402", // DOT
    "0x0D8Ce2A99Bb6e3B7Db580eD848240e4a0F9aE153", // FIL
    "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe", // XRP
    "0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd", // LINK
    "0x9C65AB58d8d978DB963e63f2bfB7121627e3a739", // MDX
    "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", // CAKE
    "0xbf5140a22578168fd562dccf235e5d43a02ce9b1", // UNI
    "0x55d398326f99059ff775485246999027b3197955", // USDT
    "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // WBNB
    "0x4338665cbb7b2485a8855a139b75d5e34ab0db94", // LTC
  ],
  "https://bsc.mdex.co/#/swap?inputCurrency=${inputCurrency}"
)