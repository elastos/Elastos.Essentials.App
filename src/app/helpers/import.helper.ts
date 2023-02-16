/**
 * This helper allows to easily do a dynamic import of one of the most used (and largest...)
 * dependency libraries.
 * If the library was already imported, the cached version is returned.
 *
 * NOTE: we cannot make a generic method with a "module" string name because webpack would not
 * be able to track the dependency modules.
 */
import type { DID, DIDStore, JWTParserBuilder, VerifiableCredential, VerifiablePresentation } from "@elastosfoundation/did-js-sdk";
import type { AlreadyExistsException, AppContext, DIDResolverAlreadySetupException, FindOptions, InsertOptions, Logger, UpdateOptions, Vault, VaultSubscription } from "@elastosfoundation/hive-js-sdk";
import type { Address, MasterWallet, MasterWalletManager, Mnemonic, WalletErrorException } from "@elastosfoundation/wallet-js-sdk";
import type { Contract } from "@ethersproject/contracts";
import type { JsonRpcProvider } from "@ethersproject/providers";
import type { Channel, Logger as FeedsLogger, MediaType, MyProfile, Post, RuntimeContext } from '@feedsnetwork/feeds-js-sdk';
import type { CurrencyAmount, Percent, Token } from "@uniswap/sdk-core";
import type WalletConnect from "@walletconnect/client";
import type Client from "@walletconnect/sign-client";
import type { ec } from "elliptic";
import type PhishingDetector from "eth-phishing-detect";
import type { providers, utils, Wallet, wordlists } from "ethers";
import type { defaultPath, HDNode } from "ethers/lib/utils";
import type { Pair, Trade } from 'src/app/thirdparty/custom-uniswap-v2-sdk/src';
import type Web3 from "web3";
import type { sha3 } from "web3-utils";

let importsCache: { [moduleName: string]: any } = {};

export const lazyWeb3Import = async (): Promise<typeof Web3> => {
  if (!importsCache["web3"])
    importsCache["web3"] = await import("web3");

  return importsCache["web3"].default;
}

export const lazyWeb3UtilsImport = async (): Promise<{ sha3: typeof sha3 }> => {
  if (!importsCache["web3-utils"])
    importsCache["web3-utils"] = await import("web3-utils");

  return {
    sha3: importsCache["web3-utils"].sha3
  };
}

export const lazyEthersImport = async (): Promise<{
  Wallet: typeof Wallet,
  utils: typeof utils,
  providers: typeof providers,
  wordlists: typeof wordlists
}> => {
  if (!importsCache["ethers"])
    importsCache["ethers"] = await import("ethers");

  return {
    Wallet: importsCache["ethers"].Wallet,
    utils: importsCache["ethers"].utils,
    providers: importsCache["ethers"].providers,
    wordlists: importsCache["ethers"].wordlists
  }
}

export const lazyEthersLibUtilImport = async (): Promise<{
  HDNode: typeof HDNode,
  defaultPath: typeof defaultPath,
}> => {
  if (!importsCache["ethers/lib/utils"])
    importsCache["ethers/lib/utils"] = await import("ethers/lib/utils");

  return {
    HDNode: importsCache["ethers/lib/utils"].HDNode,
    defaultPath: importsCache["ethers/lib/utils"].defaultPath,
  }
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

export const lazyUniswapSDKCoreImport = async (): Promise<{ CurrencyAmount: typeof CurrencyAmount, Token: typeof Token, Percent: typeof Percent }> => {
  if (!importsCache["@uniswap/sdk-core"])
    importsCache["@uniswap/sdk-core"] = await import("@uniswap/sdk-core");

  return {
    CurrencyAmount: importsCache["@uniswap/sdk-core"].CurrencyAmount,
    Token: importsCache["@uniswap/sdk-core"].Token,
    Percent: importsCache["@uniswap/sdk-core"].Percent
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

export const lazyWalletConnectSignClientImport = async (): Promise<typeof Client> => {
  if (!importsCache["@walletconnect/sign-client"])
    importsCache["@walletconnect/sign-client"] = await import("@walletconnect/sign-client");

  return importsCache["@walletconnect/sign-client"].default;
}

export const lazyEllipticImport = async (): Promise<{ ec: typeof ec }> => {
  if (!importsCache["elliptic"])
    importsCache["elliptic"] = await import("elliptic");

  return { ec: importsCache["elliptic"].ec };
}

export const lazyElastosDIDSDKImport = async (): Promise<{
  JWTParserBuilder: typeof JWTParserBuilder,
  VerifiablePresentation: typeof VerifiablePresentation,
  VerifiableCredential: typeof VerifiableCredential,
  DID: typeof DID,
  DIDStore: typeof DIDStore
}> => {
  if (!importsCache["@elastosfoundation/did-js-sdk"])
    importsCache["@elastosfoundation/did-js-sdk"] = await import("@elastosfoundation/did-js-sdk");

  return {
    JWTParserBuilder: importsCache["@elastosfoundation/did-js-sdk"].JWTParserBuilder,
    VerifiablePresentation: importsCache["@elastosfoundation/did-js-sdk"].VerifiablePresentation,
    VerifiableCredential: importsCache["@elastosfoundation/did-js-sdk"].VerifiableCredential,
    DID: importsCache["@elastosfoundation/did-js-sdk"].DID,
    DIDStore: importsCache["@elastosfoundation/did-js-sdk"].DIDStore,
  };
}

export const lazyElastosHiveSDKImport = async (): Promise<{
  AppContext: typeof AppContext,
  VaultSubscription: typeof VaultSubscription,
  Vault: typeof Vault,
  FindOptions: typeof FindOptions,
  UpdateOptions: typeof UpdateOptions,
  InsertOptions: typeof InsertOptions,
  AlreadyExistsException: typeof AlreadyExistsException,
  DIDResolverAlreadySetupException: typeof DIDResolverAlreadySetupException,
  Logger: typeof Logger
}> => {
  if (!importsCache["@elastosfoundation/hive-js-sdk"])
    importsCache["@elastosfoundation/hive-js-sdk"] = await import("@elastosfoundation/hive-js-sdk");

  return {
    AppContext: importsCache["@elastosfoundation/hive-js-sdk"].AppContext,
    VaultSubscription: importsCache["@elastosfoundation/hive-js-sdk"].VaultSubscription,
    Vault: importsCache["@elastosfoundation/hive-js-sdk"].Vault,
    FindOptions: importsCache["@elastosfoundation/hive-js-sdk"].FindOptions,
    UpdateOptions: importsCache["@elastosfoundation/hive-js-sdk"].UpdateOptions,
    InsertOptions: importsCache["@elastosfoundation/hive-js-sdk"].InsertOptions,
    AlreadyExistsException: importsCache["@elastosfoundation/hive-js-sdk"].AlreadyExistsException,
    DIDResolverAlreadySetupException: importsCache["@elastosfoundation/hive-js-sdk"].DIDResolverAlreadySetupException,
    Logger: importsCache["@elastosfoundation/hive-js-sdk"].Logger
  };
}

export const lazyElastosWalletSDKImport = async (): Promise<{
  MasterWalletManager: typeof MasterWalletManager,
  WalletErrorException: typeof WalletErrorException,
  MasterWallet: typeof MasterWallet,
  Mnemonic: typeof Mnemonic,
  Address: typeof Address
}> => {
  if (!importsCache["@elastosfoundation/wallet-js-sdk"])
    importsCache["@elastosfoundation/wallet-js-sdk"] = await import("@elastosfoundation/wallet-js-sdk");

  return {
    MasterWalletManager: importsCache["@elastosfoundation/wallet-js-sdk"].MasterWalletManager,
    WalletErrorException: importsCache["@elastosfoundation/wallet-js-sdk"].WalletErrorException,
    MasterWallet: importsCache["@elastosfoundation/wallet-js-sdk"].MasterWallet,
    Mnemonic: importsCache["@elastosfoundation/wallet-js-sdk"].Mnemonic,
    Address: importsCache["@elastosfoundation/wallet-js-sdk"].Address
  };
}

export const lazyFeedsSDKImport = async (): Promise<{
  Channel: typeof Channel,
  Logger: typeof FeedsLogger,
  MediaType: typeof MediaType
  MyProfile: typeof MyProfile
  Post: typeof Post
  RuntimeContext: typeof RuntimeContext
}> => {
  if (!importsCache["@feedsnetwork/feeds-js-sdk"])
    importsCache["@feedsnetwork/feeds-js-sdk"] = await import("@feedsnetwork/feeds-js-sdk");

  return {
    Channel: importsCache["@feedsnetwork/feeds-js-sdk"].Channel,
    Logger: importsCache["@feedsnetwork/feeds-js-sdk"].Logger,
    MediaType: importsCache["@feedsnetwork/feeds-js-sdk"].MediaType,
    MyProfile: importsCache["@feedsnetwork/feeds-js-sdk"].MyProfile,
    Post: importsCache["@feedsnetwork/feeds-js-sdk"].Post,
    RuntimeContext: importsCache["@feedsnetwork/feeds-js-sdk"].RuntimeContext,
  };
}

export const lazyKavaImport = async (): Promise<any> => {
  if (!importsCache["@kava-labs/javascript-sdk"])
    importsCache["@kava-labs/javascript-sdk"] = await import("@kava-labs/javascript-sdk");

  return importsCache["@kava-labs/javascript-sdk"];
}

export const lazyEvmosImport = async (): Promise<any> => {
  if (!importsCache["@evmos/address-converter"])
    importsCache["@evmos/address-converter"] = await import("@evmos/address-converter");

  return importsCache["@evmos/address-converter"];
}

export const lazyChaingeImport = async (): Promise<typeof Web3> => {
  if (!importsCache["@chainge/sdk"])
    importsCache["@chainge/sdk"] = await import("@chainge/sdk");

  return importsCache["@chainge/sdk"].default;
}

export const lazyTronWebImport = async (): Promise<any> => {
    if (!importsCache["tronweb"])
      importsCache["tronweb"] = await import("tronweb");

    return importsCache["tronweb"].default;
}