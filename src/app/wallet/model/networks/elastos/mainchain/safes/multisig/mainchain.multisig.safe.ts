import BIP32Factory from 'bip32';
import { StandardMultiSigMasterWallet } from "src/app/wallet/model/masterwallets/standard.multisig.masterwallet";
import { SignTransactionResult } from 'src/app/wallet/model/safes/safe.types';
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import * as ecc from 'tiny-secp256k1';
import { Native } from "../../../../../../services/native.service";
import { Safe } from "../../../../../safes/safe";
import { ElastosMainChainSafe } from '../mainchain.safe';

const bip32 = BIP32Factory(ecc);

export class MainChainMultiSigSafe extends Safe implements ElastosMainChainSafe {
  constructor(protected masterWallet: StandardMultiSigMasterWallet) {
    super(masterWallet);
  }

  public async getAddresses(startIndex: number, count: number, internalAddresses: boolean): Promise<string[]> {
    /* let elastosMainChainNetwork: networks.Network = {
      messagePrefix: "", // Unused for now?
      bech32: "", // Unused for now?
      bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4
      },
      pubKeyHash: 0x21, // the prefix of public key hash of elastos
      scriptHash: 0x12, // the prefix of script hash key of elastos
      wif: 0 // Unused if not importing by WIF?
    } */

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

    /* let hd = bip32.fromSeed(
      seed,
      //Buffer.from("000102030405060708090a0b0c0d0e0f"),
      //Buffer.from("74348e40d34ba356b5909d5db6a62b92155a9a6b40ba540771d463f93ce609efbe22fd9a0a86f7b4b8246653a33c4f92e25eaebc5d66b2b43dc007e4893656e8", "hex"),
      //networks.bitcoin
      elastosMainChainNetwork
    );

    console.log("hd bip32 xpub", hd.neutered().toBase58());

    let account = hd.derivePath("m/44'/0");
    console.log("account bip32 xpub", account.neutered().toBase58());
    let account2 = hd.derivePath("m/44'/0'");
    console.log("account2 bip32 xpub", account2.neutered().toBase58()); */

    /* let derived = hd.derivePath("m/44'/0'/0'/0/0"); // elastos mainchain

    console.log("HD", hd, hd.toBase58(), hd.publicKey.toString("hex"), hd.privateKey.toString("hex"));
    console.log("DERIVED", derived, derived.toBase58(), derived.publicKey.toString("hex"), derived.privateKey.toString("hex"));
 */

    /* To generate a segwit address:
     const { address } = bitcoin.payments.p2wsh({
      redeem: bitcoin.payments.p2ms({ m: 3, pubkeys }),
    }); */


    //let testXpubKey = HDKey.newWithSeed(Buffer.from("000102030405060708090a0b0c0d0e0f"), 'secp256k1');
    //console.log("testXpubKey", testXpubKey.getPublicKeyBase58(), testXpubKey.getPublicKeyString());

    //let mnemonic = "zero zero zero zero zero zero zero zero zero zero zero zero";
    /*let mnemonic = "plug air wave link situate width turtle devote hidden ticket method company";
    let seed = mnemonicToSeedSync(mnemonic);
    //console.log("zeroSeed", zeroSeed.toString("hex"))

    let key = HDKey.newWithMnemonic(mnemonic, "", 'p256', ELASTOS_MAINCHAIN_VERSIONS);

    // "m/45'" (BIP45) is the path to get the multisig wallet (ela mainchain) - OK HERE - same as ELA wallet
    // ela wallet / spv sdk use BIP45 multisig format for xpub
    console.log("m/45' xpub", key.deriveWithPath("m/45'").serializePublicKeyBase58());

    // OK here - same as zuohuahua
    let derived = key.deriveWithPath("m/44'/0'/0'/0/0");
    console.log("derived ELA ADDRESS", derived.getElastosAddress());
    console.log("derived DID", derived.getDID());
    console.log("derived Public key", derived.getPublicKeyString());
    console.log("derived Private key", derived.getPrivateKeyString());

    // TEST FOR NOW
    // let pubKeys = this.masterWallet.signersExtPubKeys.map(hex => Buffer.from(hex, 'hex'));
    //const { address } = payments.p2sh({
    //  redeem: payments.p2ms({
    //    m: 2, pubkeys: pubKeys // TODO: what is m: 2 ? number of mandatory signers?
    //  }),
    //});

    // TMP FORCE KEYS FOR TESTS - TODO: get them from multisig master wallet
    this.masterWallet.signersExtPubKeys = [
      "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz", // found on internet
      "xpub69bNupQzCmTWQ4JW83hkpG6cSSf8mtSBDFkE7Xy8AEt4acjFe97FxKygBF2aSJydEL26GjaG3oXit2HsvYDWAkqcM2CZH1QCR42U5HiD1cE" // plug air wave
    ];
    let numberOfCosigners = this.masterWallet.signersExtPubKeys.length;

    // Convert extended "purpose" public keys (m/45' stored in the wallet model) into public keys
    // https://bips.xyz/45
    let cosignersPublicKeys = Multisig.extendedToPublicKeys(this.masterWallet.signersExtPubKeys, 'p256', ELASTOS_MAINCHAIN_VERSIONS);

    // Find user's extended public key (xpub) and convert it to public key
    //let userPurposeXpub =  // TODO: find signing wallet by ID -> .getMultisigExtendedPublicKey();
    let userPurposeXpub = "xpub69bNupQzCmTWQ4JW83hkpG6cSSf8mtSBDFkE7Xy8AEt4acjFe97FxKygBF2aSJydEL26GjaG3oXit2HsvYDWAkqcM2CZH1QCR42U5HiD1cE";
    let userPurposeHDKey = HDKey.fromExtendedKey(userPurposeXpub, 'p256', ELASTOS_MAINCHAIN_VERSIONS);
    let userPurposePublicKey = userPurposeHDKey.getPublicKeyBytes();
    console.log("purpose key string", userPurposeHDKey.getPublicKeyString());

    // Get signing wallet (current user's) cosigner index
    let userCosignerIndex = Multisig.getCosignerIndex(cosignersPublicKeys, userPurposePublicKey);
    console.log("userCosignerIndex", userCosignerIndex);

    // For each cosigner, use his purpose key to derive a public key to generate the address
    let changeIndex = 0; // 0 for an external address, 1 for a change/internal address
    let addressIndex = 0; // Multi address index. For now, always use 0. Later, find the next unused address.
    let cosignersKeysForAddress: Buffer[] = [];
    for (let i = 0; i < numberOfCosigners; i++) {
      let key = HDKey.fromExtendedKey(this.masterWallet.signersExtPubKeys[i], 'p256', ELASTOS_MAINCHAIN_VERSIONS);
      let publicKey = userPurposeHDKey.getPublicKeyBytes();
      let cosignerIndex = Multisig.getCosignerIndex(cosignersPublicKeys, publicKey);

      let derivedPublicKey = key.deriveChild(cosignerIndex).deriveChild(changeIndex).deriveChild(addressIndex);
      cosignersKeysForAddress.push(derivedPublicKey.getPublicKeyBytes());
    }
    console.log("cosignersKeysForAddress", cosignersKeysForAddress);

    let multiSigAddress = HDKey.getElastosMainChainMultiSigAddress(this.masterWallet.requiredSigners, cosignersKeysForAddress);
    console.log("multiSigAddress", multiSigAddress);*/

    /*  1. Get the cosigner_index by sorting the public key "m/45'/*" by lexicographically sorting
 2. Store the cosigner_index and public key together, and derive the corresponding public key according to the required address.The rules are the same as BIP44.
     3. After collecting all the public keys, convert the public keys to the multi - sig address.
  */
    /* TODO:
    - compute multisig ELA address at given index from N signer xpub
      - sort xpub and
      - custom redeem script based on
    - create multisig ela payment transaction
    - sign multi transaction in multiple steps
    - add screen to export multisig xpub
    */

    if (startIndex === 0)
      return await ["XVbCTM7vqM1qHKsABSFH4xKN1qbp7ijpWf"]; // TODO - hardcoded tests for now - single address
    else
      return [];
  }

  public async getOwnerAddress(): Promise<string> {
    return await "XVbCTM7vqM1qHKsABSFH4xKN1qbp7ijpWf"; // Hardcoded - equivalent of SVP getOwnerAddress();
  }

  public createTransfer(toAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public signTransaction(rawTx: string, transfer: Transfer): Promise<SignTransactionResult> {

    Native.instance.go("/multisig/status");

    return null;

    //throw new Error("Method not implemented.");
  }
}