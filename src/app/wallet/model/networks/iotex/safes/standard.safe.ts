import { from } from "@iotexproject/iotex-address-ts";
import { TxData } from "ethereumjs-tx";
import { Wallet } from "ethers";
import Antenna from "iotex-antenna";
import { Logger } from "src/app/logger";
import { AuthService } from "src/app/wallet/services/auth.service";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { EVMService } from "src/app/wallet/services/evm/evm.service";
import { MasterWallet, StandardMasterWallet } from "../../../masterwallets/masterwallet";
import { AddressUsage } from "../../../safes/safe";
import { SignTransactionResult } from "../../../safes/safe.types";
import { StandardSafe } from "../../../safes/standard.safe";
import { EVMSafe } from "../../evms/safes/evm.safe";
import { AnyNetwork } from "../../network";

export class IoTeXStandardSafe extends StandardSafe implements EVMSafe {
  protected evmAddress: string = null;
  protected iotexAddress: string = null; // TODO: persistence to not prompt password every time

  constructor(protected masterWallet: MasterWallet, protected network: AnyNetwork, protected gRPCUrl: string) {
    super(masterWallet);
  }

  public async initialize(): Promise<void> {
    let payPassword = await AuthService.instance.getWalletPassword(this.masterWallet.id);
    if (!payPassword)
      return; // Can't continue without the wallet password - cancel the initialization

    const antenna = new Antenna(this.gRPCUrl);

    let mnemonic = (this.masterWallet as StandardMasterWallet).getMnemonic(payPassword);

    let mnemonicWallet = Wallet.fromMnemonic(mnemonic);

    this.evmAddress = mnemonicWallet.address;
    const addr = from(this.evmAddress);
    this.iotexAddress = addr.string();

    // recover the whole wallet from a single private key
    try {
      /* const unlockedWallet = antenna.iotx.accounts.privateKeyToAccount(
        mnemonicWallet.privateKey
      ); */

      //console.log("unlockedWallet", unlockedWallet)

      //let account = antenna.iotx.accounts.addressToAccount(addr.string())
      //console.log("account", account)

      /* const account = await antenna.iotx.getAccount({
        address: "io1cl6rl2ev5dfa988qmgzg2x4hfazmp9vn2g66ng"
      }); */
    }
    catch (e) {
      Logger.error("IoTeXStandardSafe initialization error", e);
    }
  }

  public async getAddresses(startIndex: number, count: number, internalAddresses: boolean, usage: AddressUsage | string): Promise<string[]> {
    if (usage === AddressUsage.IOTEX || usage === AddressUsage.RECEIVE_FUNDS || usage === AddressUsage.SEND_FUNDS)
      return await [this.iotexAddress];
    else
      return await [this.evmAddress];
  }

  createTransferTransaction(toAddress: string, amount: string, gasPrice: string, gasLimit: string, nonce: number): Promise<any> {
    let web3 = EVMService.instance.getWeb3(this.network);
    const txData: TxData = {
      nonce: web3.utils.toHex(nonce),
      gasLimit: web3.utils.toHex(gasLimit),
      gasPrice: web3.utils.toHex(gasPrice),
      to: toAddress,
      value: web3.utils.toHex(web3.utils.toWei(amount.toString())),
    }
    Logger.log('wallet', 'IoTeXStandardSafe::createTransferTransaction:', txData);
    return Promise.resolve(txData);
  }

  public async signTransaction(rawTx: any, transfer: Transfer): Promise<SignTransactionResult> {
    let web3 = EVMService.instance.getWeb3(this.network);

    let mnemonic = (this.masterWallet as StandardMasterWallet).getMnemonic(await AuthService.instance.getWalletPassword(this.masterWallet.id));

    // TODO: handle wallets imported by private key
    let mnemonicWallet = Wallet.fromMnemonic(mnemonic);
    let signResult = await web3.eth.accounts.signTransaction(rawTx, mnemonicWallet.privateKey);

    return {
      signedTransaction: signResult.rawTransaction
    }
  }
}