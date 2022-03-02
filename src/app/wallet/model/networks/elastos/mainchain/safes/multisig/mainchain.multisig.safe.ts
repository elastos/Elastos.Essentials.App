import BIP32Factory from 'bip32';
import { mnemonicToSeedSync } from "bip39";
import { networks, payments } from "bitcoinjs-lib";
import { StandardMultiSigMasterWallet } from "src/app/wallet/model/masterwallets/standard.multisig.masterwallet";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import * as ecc from 'tiny-secp256k1';
import { Safe } from "../../../../../safes/safe";
import { SignTransactionResult } from "../../../../../safes/safe.types";

const bip32 = BIP32Factory(ecc);

export class MainChainMultiSigSafe extends Safe {
  constructor(protected masterWallet: StandardMultiSigMasterWallet) {
    super(masterWallet);
  }

  public async getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<string[]> {
    let elastosMainChainNetwork: networks.Network = {
      messagePrefix: "", // Unused for now?
      bech32: "", // Unused for now?
      bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4
      },
      pubKeyHash: 0x21, // the prefix of public key hash of elastos
      scriptHash: 0x12, // the prefix of script hash key of elastos
      wif: 0 // Unused if not importing by WIF?
    }

    /* addNetwork({
      name: 'livenet',
      alias: 'mainnet',
      pubkeyhash: 0x21, // the prefix of public key hash of elastos
      privatekey: 0x80,
      scripthash: 0x12, // the prefix of script hash key of elastos
      //scripthash: 0x21, // TODO: when onchain support is ready, change it.
      xpubkey: 0x0488b21e,
      xprivkey: 0x0488ade4,
      networkMagic: 0xf9beb4d9,
      port: 8333, // TODO: Change the mainnet port of elastos
      dnsSeeds: [
        'seed.elastos.org' // TODO: Add the seed node for elastos mainnet
      ]
    }); */

    let zeroSeed = mnemonicToSeedSync("zero zero zero zero zero zero zero zero zero zero zero zero");
    console.log("zeroSeed", zeroSeed.toString("hex"))

    // TODO ????
    /* if (networkIsELA()) {
      bitcore.crypto.Point.setCurve('p256')
  } else {
      bitcore.crypto.Point.setCurve('secp256k1')
  } */

    let hd = bip32.fromSeed(
      zeroSeed,
      //Buffer.from("74348e40d34ba356b5909d5db6a62b92155a9a6b40ba540771d463f93ce609efbe22fd9a0a86f7b4b8246653a33c4f92e25eaebc5d66b2b43dc007e4893656e8", "hex"),
      //networks.bitcoin
      elastosMainChainNetwork
    );

    let derived = hd.derivePath("m/44'/0'/0'/0/0"); // elastos mainchain

    console.log("HD", hd, hd.toBase58(), hd.publicKey.toString("hex"), hd.privateKey.toString("hex"));
    console.log("DERIVED", derived, derived.toBase58(), derived.publicKey.toString("hex"), derived.privateKey.toString("hex"));

    // TEST FOR NOW
    let pubKeys = this.masterWallet.signersExtPubKeys.map(hex => Buffer.from(hex, 'hex'));
    const { address } = payments.p2sh({
      redeem: payments.p2ms({
        m: 2, pubkeys: pubKeys // TODO: what is m: 2 ? number of mandatory signers?
      }),
    });

    /* To generate a segwit address:
     const { address } = bitcoin.payments.p2wsh({
      redeem: bitcoin.payments.p2ms({ m: 3, pubkeys }),
    }); */

    return await [address]; // TODO: only one address for now - how to get more addresses?
  }

  public signTransaction(rawTx: string, transfer: Transfer): Promise<SignTransactionResult> {
    throw new Error("Method not implemented.");
  }
}