/**
 * This helper allows to easily do a dynamic import of one of the most used (and largest...)
 * dependency libraries.
 * If the library was already imported, the cached version is returned.
 *
 * NOTE: we cannot make a generic method with a "module" string name because webpack would not
 * be able to track the dependency modules.
 */
import type { Contract } from "@ethersproject/contracts";
import type { JsonRpcProvider } from "@ethersproject/providers";
import type { CurrencyAmount, Token } from "@uniswap/sdk-core";
import type WalletConnect from "@walletconnect/client";
import type { ec } from "elliptic";
import type PhishingDetector from "eth-phishing-detect";
import type { Pair, Trade } from 'src/app/thirdparty/custom-uniswap-v2-sdk/src';
import type Web3 from "web3";

let importsCache: { [moduleName: string]: any } = {};

export const lazyWeb3Import = async (): Promise<typeof Web3> => {
  if (!importsCache["web3"])
    importsCache["web3"] = await import("web3");

  return importsCache["web3"].default;
}

export const lazyEthersContractImport = async (): Promise<typeof Contract> => {
  if (!importsCache["@ethersproject/contracts"])
    importsCache["@ethersproject/contracts"] = await import("@ethersproject/contracts");

  return importsCache["@ethersproject/contracts"].Contract;
}

export const lazyEthersJsonRPCProviderImport = async (): Promise<typeof JsonRpcProvider> => {
  if (!importsCache["@ethersproject/providers"])
    importsCache["@ethersproject/providers"] = await import("@ethersproject/providers");

  return importsCache["@ethersproject/providers"].JsonRpcProvider;
}

export const lazyUniswapSDKCoreImport = async (): Promise<{ CurrencyAmount: typeof CurrencyAmount, Token: typeof Token }> => {
  if (!importsCache["@uniswap/sdk-core"])
    importsCache["@uniswap/sdk-core"] = await import("@uniswap/sdk-core");

  return {
    CurrencyAmount: importsCache["@uniswap/sdk-core"].CurrencyAmount,
    Token: importsCache["@uniswap/sdk-core"].Token
  };
}

export const lazyCustomUniswapSDKImport = async (): Promise<{ Pair: typeof Pair, Trade: typeof Trade }> => {
  if (!importsCache["src/app/thirdparty/custom-uniswap-v2-sdk/src"])
    importsCache["src/app/thirdparty/custom-uniswap-v2-sdk/src"] = await import("src/app/thirdparty/custom-uniswap-v2-sdk/src");

  return {
    Pair: importsCache["src/app/thirdparty/custom-uniswap-v2-sdk/src"].Pair,
    Trade: importsCache["src/app/thirdparty/custom-uniswap-v2-sdk/src"].Trade
  };
}

export const lazyPhishingDetectorImport = async (): Promise<typeof PhishingDetector> => {
  if (!importsCache["eth-phishing-detect"])
    importsCache["eth-phishing-detect"] = await import("eth-phishing-detect");

  return importsCache["eth-phishing-detect"].default;
}

export const lazyJsonLdImport = async (): Promise<any> => {
  if (!importsCache["jsonld"])
    importsCache["jsonld"] = await import("jsonld");

  return importsCache["jsonld"].default;
}

export const lazyWalletConnectImport = async (): Promise<typeof WalletConnect> => {
  if (!importsCache["@walletconnect/client"])
    importsCache["@walletconnect/client"] = await import("@walletconnect/client");

  return importsCache["@walletconnect/client"].default;
}

export const lazyEllipticImport = async (): Promise<{ ec: typeof ec }> => {
  if (!importsCache["elliptic"])
    importsCache["elliptic"] = await import("elliptic");

  return { ec: importsCache["elliptic"].ec };
}