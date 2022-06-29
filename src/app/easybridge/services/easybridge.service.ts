import { Injectable } from "@angular/core";
import BigNumber from "bignumber.js";
import { Observable, Subscriber } from "rxjs";
import { sleep } from "src/app/helpers/sleep.helper";
import { Logger } from "src/app/logger";
import { EVMNetwork } from "src/app/wallet/model/networks/evms/evm.network";
import { EVMSafe } from "src/app/wallet/model/networks/evms/safes/evm.safe";
import { AnyMainCoinEVMSubWallet } from "src/app/wallet/model/networks/evms/subwallets/evm.subwallet";
import { AddressUsage } from "src/app/wallet/model/safes/addressusage";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { ERC20CoinService } from "src/app/wallet/services/evm/erc20coin.service";
import { EVMService } from "src/app/wallet/services/evm/evm.service";
import { WalletNetworkService } from "src/app/wallet/services/network.service";
import { WalletService } from "src/app/wallet/services/wallet.service";
import Web3 from "web3";
import { Contract } from "web3-eth-contract";
import { availableBridges } from "../config/bridges";
import { bridgeableTokens } from "../config/bridgetokens";
import { ChainInfo } from "../model/bridge";
import { BridgeableToken } from "../model/bridgeabletoken";
import { DestinationToken } from "../model/destinationtoken";
import { SourceToken } from "../model/sourcetoken";

export const BRIDGE_FAUCET_API = 'https://api.glidefinance.io'
export const VALIDATOR_TIMEOUT_MS = 300000 // Milliseconds

type BridgeType = "native" | "token";

type BridgeContext = {
  sourceToken: BridgeableToken;
  destinationToken: BridgeableToken;
  sourceNetwork: EVMNetwork;
  destinationNetwork: EVMNetwork;
  bridgeSelected: string;
  bridgeDestinationSelected: string;
  bridgeParams: ChainInfo;
  bridgeParamsOtherSide: ChainInfo;
  destinationParams: ChainInfo;
  destinationParamsOtherSide: ChainInfo;
}

/**
 * This bridge service uses TOKBRIDGE / SHADOWTOKEN (Elastos network)
 */
@Injectable({
  providedIn: "root"
})
export class EasyBridgeService {
  public static instance: EasyBridgeService;

  // TEMP
  //private tokenToBridge = bridgeableTokens.tokens[1] // TEMP - native HT from heco
  //private amount = 0.15;

  constructor(
    private walletManager: WalletService,
    private networkService: WalletNetworkService,
    private evmService: EVMService,
    private erc20CoinService: ERC20CoinService,
  ) {
    EasyBridgeService.instance = this;
  }

  /**
   * Fetches user's balance for all bridgeable tokens and returns tokens that have a balance,
   * with the balance in human readable format.
   */
  public fetchBridgeableBalances(mainCoinSubWallet: AnyMainCoinEVMSubWallet): Observable<SourceToken[]> {
    let usableTokens: SourceToken[] = [];

    Logger.log("easybridge", "Fetching balances");

    return new Observable(observer => {
      void (async () => {
        let walletAddress = await mainCoinSubWallet.getTokenAddress(AddressUsage.EVM_CALL);

        let checkCount = 0;
        for (let token of bridgeableTokens.tokens) {
          void this.fetchBridgeableTokenBalance(token, walletAddress, usableTokens, observer).then(() => {
            checkCount++;
            if (checkCount === bridgeableTokens.tokens.length) {
              Logger.log("easybridge", "Balance fetch complete");
              observer.complete();
            }
          });
        }
      })();
    });
  }

  private async fetchBridgeableTokenBalance(token: BridgeableToken, walletAddress: string, usableTokens: SourceToken[], observer: Subscriber<SourceToken[]>): Promise<void> {
    // Skip the token if it's on elastos. We only want to bridge from other networks for now.
    if (this.isTokenOnElastosNetwork(token))
      return;

    try {
      let network = <EVMNetwork>this.networkService.getNetworkByChainId(token.chainId);
      let web3 = await this.evmService.getWeb3(network);

      let balance: BigNumber;
      if (!token.isNative) {
        // Convert chain balance format (long) to human readable format
        let chainBalance = await this.erc20CoinService.fetchERC20TokenBalance(network, token.address, walletAddress);
        balance = this.toHumanReadableAmount(chainBalance, token.decimals);
      }
      else {
        let chainBalance = await web3.eth.getBalance(walletAddress);
        balance = this.toHumanReadableAmount(chainBalance, token.decimals);
      }

      Logger.log("easybridge", `Got balance ${balance} for token ${token.symbol} (${token.name}) on chain ${token.chainId}`);

      // Only return tokens that have a balance
      if (balance.gt(0)) {
        // Only return if the balance is larger than the min amount needed for the bridge
        if (!token.minTx || balance.gt(token.minTx)) {
          usableTokens.push({
            token,
            balance: new BigNumber(balance)
          });
        }
      }
    }
    catch (e) {
      Logger.error("easybridge", e);
      // Silent catch
    }

    observer.next(usableTokens);
  }

  /**
   * Computes and returns the tokens that can be used as a destination token, for a given source token.
   *
   * The returned list is computed like this (or will be later):
   * - the wrapped version of the token (no matter if native or ERC20)
   * - the destination chain native coin is always returned (eg: ELA on ESC) - we will swap if needed
   */
  public getUsableDestinationTokens(sourceToken: SourceToken, destinationChainId: number): DestinationToken[] {
    let destinationTokens: DestinationToken[] = [];

    // Native coin
    let nativeCoin = bridgeableTokens.tokens.find(token => token.isNative && token.chainId == destinationChainId);
    destinationTokens.push({
      token: nativeCoin,
      estimatedAmount: new BigNumber(-1)
    });

    // Peer token
    let peerTokenOnDestinationChain = this.getPeerTokenOnOtherChain(sourceToken.token, destinationChainId);
    if (peerTokenOnDestinationChain) {
      destinationTokens.push({
        token: peerTokenOnDestinationChain,
        estimatedAmount: new BigNumber(-1)
      });
    }

    return destinationTokens;
  }

  /**
   * Finds the given token bridge equivalent on another chain
   */
  public getPeerTokenOnOtherChain(token: BridgeableToken, otherChainId: number): BridgeableToken {
    if (token.isNative) {
      return bridgeableTokens.tokens.find(t => {
        // Native coin: find by 'isWrappedNative'
        return t.isWrappedNative && t.chainId === otherChainId && t.origin === token.chainId;
      });
    }
    else {
      // ERC20 token: find by wrapped addresses
      if (token.wrappedAddresses && token.wrappedAddresses[otherChainId]) {
        return bridgeableTokens.tokens.find(t => t.address === token.wrappedAddresses[otherChainId]);
      }
      else {
        return null;
      }
    }
  }

  private isTokenOnElastosNetwork(token: BridgeableToken): boolean {
    return token.chainId === 20;
  }

  private computeBridgeContext(sourceToken: BridgeableToken, destinationToken: BridgeableToken): BridgeContext {
    const sourceNetwork = <EVMNetwork>WalletNetworkService.instance.getNetworkByChainId(sourceToken.chainId);
    const destinationNetwork = <EVMNetwork>WalletNetworkService.instance.getNetworkByChainId(destinationToken.chainId);

    const bridgeSelected = `${sourceNetwork.getMainChainID()}_${destinationNetwork.getMainChainID()}`;
    const bridgeDestinationSelected = `${destinationNetwork.getMainChainID()}_${sourceNetwork.getMainChainID()}`;

    const bridgeType: BridgeType = sourceToken.isNative ? "native" : "token";

    const bridgeParams = availableBridges[bridgeSelected][bridgeType][sourceNetwork.getMainChainID()];
    const bridgeParamsOtherSide = availableBridges[bridgeSelected][bridgeType][destinationNetwork.getMainChainID()];
    const destinationParams = availableBridges[bridgeDestinationSelected][bridgeType][sourceNetwork.getMainChainID()];
    const destinationParamsOtherSide = availableBridges[bridgeDestinationSelected][bridgeType][destinationNetwork.getMainChainID()];

    let context: BridgeContext = {
      sourceToken,
      destinationToken,
      sourceNetwork,
      destinationNetwork,
      bridgeSelected,
      bridgeDestinationSelected,
      bridgeParams,
      bridgeParamsOtherSide,
      destinationParams,
      destinationParamsOtherSide
    }

    return context;
  }

  /**
   * Sends a bridge transaction requests on the source chain.
   * On successful publish, the tx id is returned.
   * This method does not wait for tokens to be recieved on the destination chain.
   */
  public async executeBridge(mainCoinSubWallet: AnyMainCoinEVMSubWallet, sourceToken: BridgeableToken, destinationToken: BridgeableToken, amount: BigNumber): Promise<{ txId: string, destinationBlockBefore: number }> {
    Logger.log("easybridge", "Token to bridge:", sourceToken);

    // Do the actual coin transfer
    try {
      let bridgeContext = this.computeBridgeContext(sourceToken, destinationToken);

      // If mediator is not approved to spend user's tokens yet, make it approved. Await will complete after approval
      await this.approveMediatorAsSpenderIfNeeded(mainCoinSubWallet, bridgeContext, amount);

      let result = await this.coinTransfer(mainCoinSubWallet, bridgeContext, amount);

      return result;
    } catch (e) {
      Logger.error("easybridge", "Execute bridge error:", e);
    }
  }

  private async coinTransfer(mainCoinSubWallet: AnyMainCoinEVMSubWallet, context: BridgeContext, amount: BigNumber): Promise<{ txId: string, destinationBlockBefore: number }> {
    let accountAddress = await mainCoinSubWallet.getTokenAddress(AddressUsage.EVM_CALL);

    console.log("Bridging", context.sourceToken, context, amount.toString(), accountAddress);

    const from = accountAddress;
    const recipient = accountAddress;
    const value = this.toChainHexAmount(amount, context.sourceToken.decimals);

    const destProvider = await this.evmService.getWeb3(context.destinationNetwork);
    const fromDestBlock = await destProvider.eth.getBlockNumber();

    Logger.log("easybridge", "Getting gas price");
    const gasPrice = await this.evmService.getGasPrice(context.sourceNetwork);

    if (amount.lt(context.bridgeParams.minTx))  // TODO: improve
      throw new Error(`Amount ${amount} too low, min ${context.bridgeParams.minTx}`);

    // if token, then call erc677Contract, otherwise nativeSourceMediator
    if (!context.sourceToken.isNative) {
      const type = 'relayTokens';

      const mediator = this.foreignOrigin(context.sourceToken.address, context.sourceToken.chainId) ? context.destinationParams.contract : context.bridgeParams.contract;

      const tokenSourceMediator = this.getNativeSourceMediator(context.sourceNetwork, mediator, accountAddress);

      Logger.log("easybridge", "Calling bridge method (case 1)");
      const receiptToken = await (await tokenSourceMediator).methods.relayTokens(context.sourceToken.address, recipient, value).send({
        from: from,
        gasPrice: gasPrice,
      })/* .on('transactionHash', (hash) => {
          console.log("transactionHash", hash);
        })
        .on('receipt', (receipt) => {
          console.log("receipt", receipt);
        })
        .on('confirmation', (confirmationNumber, receipt) => {
          console.log("confirmation", confirmationNumber, receipt);
        })
        .on('error', (error, receipt) => {
          console.error("error", error);
        });
    } */

      await sleep(1000);
      // TODO toastSuccess(t('Bridging in process. Awaiting relay from mediator.'));
      if (context.destinationNetwork.getMainChainID() === 20) {
        void this.callBridgeFaucet(receiptToken.hash, type, context.sourceNetwork, recipient);
      }

      // TODO await this.detectExchangeFinished(account, bridgeType, sourceNetwork, destNetwork, tokenDestinationMediator, destinationParamsOtherSide, receiptToken.hash, isToken, fromDestBlock);

      return null;

    } else {
      // Native
      const type = 'relayTokens';
      const nativeSourceMediator = await this.getNativeSourceMediator(context.sourceNetwork, context.bridgeParams.contract, accountAddress);

      Logger.log("easybridge", "Calling bridge method (case 3)");
      let relayMethod = await nativeSourceMediator.methods.relayTokens(recipient);
      //let relayMethod = await nativeSourceMediator.methods.executionDailyLimit();
      //let test = await relayMethod.call();

      // TODO: make a more generic method on EVM subwallet to create a tx from a web3 method call


      // TODO: FAILURE COULD BE BECAUSE:
      // - min amount too low
      // - not enough balance
      // - erc20 token spending not approved
      // - ?

      // Estimate gas cost - don't catch, we need a real estimation from chain
      Logger.log("easybridge", "Estimating gas for the relay token method");
      let gasTemp = await relayMethod.estimateGas({
        from: from,
        value: value
      });
      // '* 1.5': Make sure the gaslimit is big enough - add a bit of margin for fluctuating gas price
      let gasLimit = Math.ceil(gasTemp * 1.5).toString();

      Logger.log("easybridge", "Getting nonce");
      let nonce = await this.evmService.getNonce(context.sourceNetwork, accountAddress);

      Logger.log("easybridge", "Creating unsigned transaction");
      let safe = <EVMSafe><unknown>mainCoinSubWallet.networkWallet.safe;
      let unsignedTx = await safe.createContractTransaction(context.bridgeParams.contract, value, gasPrice, gasLimit, nonce, relayMethod.encodeABI());

      Logger.log("easybridge", "Created unsigned transaction", unsignedTx);

      Logger.log("easybridge", "Signing and sending transaction");
      const transfer = new Transfer();
      Object.assign(transfer, {
        masterWalletId: mainCoinSubWallet.networkWallet.masterWallet.id,
        subWalletId: mainCoinSubWallet.id,
      });
      let sendResult = await mainCoinSubWallet.signAndSendRawTransaction(unsignedTx, transfer, false);
      Logger.log("easybridge", "Transaction result:", sendResult);

      if (!sendResult || !sendResult.published)
        return null;

      // TODO toastSuccess(t('Bridging in process. Awaiting relay from mediator.'));
      if (context.destinationNetwork.getMainChainID()) {
        // TODO void this.callBridgeFaucet(receiptNative.hash, type, sourceNetwork, recipient);
      }

      return { txId: sendResult.txid, destinationBlockBefore: fromDestBlock };

      // TODO: Don't await here, return tx receipt directly, and emit rxjs event for detection
      // TODO: MOVE await this.detectExchangeFinished(accountAddress, bridgeType, sourceNetwork, destinationNetwork, destinationParamsOtherSide.contract, destinationParamsOtherSide, fromDestBlock);
    }
  }

  // Detect if destination exchange finished transfer
  public async detectExchangeFinished(
    mainCoinSubWallet: AnyMainCoinEVMSubWallet,
    sourceToken: BridgeableToken,
    destinationToken: BridgeableToken, fromBlock: number): Promise<boolean> {

    let accountAddress = await mainCoinSubWallet.getTokenAddress(AddressUsage.EVM_CALL);
    let bridgeContext = this.computeBridgeContext(sourceToken, destinationToken);

    const destProvider = await this.evmService.getWeb3(bridgeContext.destinationNetwork);
    let sourceMediator: Contract;
    let tokensBridgedEvent: string;
    let topics: (string | string[])[];

    let paddedRecipientAddress = '0x' + accountAddress.substr(2).padStart(64, "0"); // 64 = 32 bytes * 2 chars per byte // 20 bytes to 32 bytes

    debugger;

    if (sourceToken.isNative) {
      sourceMediator = await this.getNativeSourceMediator(bridgeContext.destinationNetwork, bridgeContext.destinationParamsOtherSide.contract, accountAddress);
      tokensBridgedEvent = Web3.utils.sha3("TokensBridged(address,uint256,bytes32)");
      topics = [tokensBridgedEvent, paddedRecipientAddress];
    } else {
      const tokenDestinationMediator = this.foreignOrigin(bridgeContext.sourceToken.address, bridgeContext.sourceToken.chainId) ? bridgeContext.bridgeParamsOtherSide.contract : bridgeContext.destinationParamsOtherSide.contract;
      sourceMediator = await this.getTokenSourceMediator(bridgeContext.destinationNetwork, tokenDestinationMediator, accountAddress);
      tokensBridgedEvent = Web3.utils.sha3("TokensBridged(address,address,uint256,bytes32)");
      topics = [tokensBridgedEvent, null, paddedRecipientAddress];
    }

    // Wait until we can detect that the transfer is finished
    const stopTime = Date.now() + VALIDATOR_TIMEOUT_MS
    while (Date.now() <= stopTime) {
      const currentBlock = await destProvider.eth.getBlockNumber();

      Logger.log("easybridge", "Checking bridge status");

      const tokenBridgedEvents = await sourceMediator.getPastEvents("TokensBridged", {
        fromBlock,
        toBlock: currentBlock,
        address: bridgeContext.destinationParamsOtherSide.contract,
        //filter: { txreceipt_status: 1 },
        topics
      });

      if (tokenBridgedEvents.length > 0) {
        Logger.log("easybridge", "Bridge complete!", tokenBridgedEvents);
        // TODO toastSuccess(t('Transfer complete! You can now use your assets on the destination network.'));
        return true;
      }

      await sleep(5000);
    }

    if (Date.now() > stopTime) {
      // TODO toastError("Bridge completion event not detected within 5 minutes. Please monitor block explorer for receipt.");
    }

    return false;
  }

  private async getNativeSourceMediator(network: EVMNetwork, contractAddress: string, signerWalletAddress: string): Promise<Contract> {
    let AMB_NATIVE_ERC_ABI = (await import('src/assets/easybridge/contracts/AMB_NATIVE_ERC_ABI.json')).default as any;
    return new (await this.evmService.getWeb3(network)).eth.Contract(AMB_NATIVE_ERC_ABI, contractAddress, { from: signerWalletAddress });
  }

  private async getTokenSourceMediator(network: EVMNetwork, contractAddress: string, signerWalletAddress: string): Promise<Contract> {
    let MULTI_AMB_ERC_ERC_ABI = (await import('src/assets/easybridge/contracts/MULTI_AMB_ERC_ERC_ABI.json')).default as any;
    return new (await this.evmService.getWeb3(network)).eth.Contract(MULTI_AMB_ERC_ERC_ABI, contractAddress, { from: signerWalletAddress });
  }

  private async getErc677Contract(network: EVMNetwork, contractAddress: string, signerWalletAddress: string): Promise<Contract> {
    let ERC677_ABI = (await import('src/assets/easybridge/contracts/ERC677_ABI.json')).default as any;
    return new (await this.evmService.getWeb3(network)).eth.Contract(ERC677_ABI, contractAddress, { from: signerWalletAddress });
  }

  private async getErc20Contract(network: EVMNetwork, contractAddress: string, signerWalletAddress: string): Promise<Contract> {
    let ERC20_ABI = (await import('src/assets/wallet/ethereum/StandardErc20ABI.json')).default as any;
    return new (await this.evmService.getWeb3(network)).eth.Contract(ERC20_ABI, contractAddress, { from: signerWalletAddress });
  }

  private async approveMediatorAsSpenderIfNeeded(mainCoinSubWallet: AnyMainCoinEVMSubWallet, context: BridgeContext, amount: BigNumber): Promise<boolean> {
    if (context.sourceToken.isNative)
      return false;

    if (context.bridgeParams === undefined)
      return false;

    let accountAddress = await mainCoinSubWallet.getTokenAddress(AddressUsage.EVM_CALL);
    let network = mainCoinSubWallet.networkWallet.network;

    const tokenContract = await this.getErc20Contract(network, context.sourceToken.address, accountAddress);
    const mediator = this.foreignOrigin(context.sourceToken.address, context.sourceToken.chainId) ? context.bridgeParamsOtherSide.contract : context.bridgeParams.contract;

    try {
      const response = await tokenContract.methods.allowance(accountAddress, mediator).call();
      const currentAllowance = new BigNumber(response.toString())
      console.log(currentAllowance.toString())
      const value = new BigNumber(this.parseValue(amount, context.sourceToken.decimals).toString())
      console.log(value.toString())

      return !currentAllowance.gt(value);
    } catch (error) {
      return false;
    }
  }

  private useApproveMediator(currency, request, reverseBridgeParams) {
    /* TODO const [requestedApproval, setRequestedApproval] = useState(false)
    const [approvalComplete, setApprovalComplete] = useState(false)
    const { toastSuccess, toastError } = useToast()
    // const dispatch = useAppDispatch()
    const { account, library } = useWeb3React()

    const handleApprove = useCallback(async () => {
      const isToken = currency instanceof Token
      if (!isToken) { setRequestedApproval(false); return }
      if (request === undefined) { setRequestedApproval(false); return }

      const mediator = foreignOrigin(currency.address, currency.chainId) ? reverseBridgeParams.contract : request.contract;
      const tokenContract = getBep20Contract(currency.address, library.getSigner(account))
      // const response = (await tokenContract.allowance(account, mediator))
      // const allowance = ethersToBigNumber(response)

      try {
        // if (!allowance.gt(0)) {
        setRequestedApproval(true)
        const tx = await tokenContract.approve(mediator, ethers.constants.MaxUint256)
        const receipt = await tx.wait()
        // dispatch(updateUserAllowance(sousId, account))
        if (receipt.status) {
          toastSuccess(
            t('Contract Enabled'),
            t('You can now bridge your %symbol%!', { symbol: currency.symbol }),
          )
          setRequestedApproval(false)
          setApprovalComplete(true)
        } else {
          // user rejected tx or didn't go thru
          toastError(t('Error'), t('Please try again. Confirm the transaction and make sure you are paying enough gas!'))
          setRequestedApproval(false)
        }
        // } else {
        // setRequestedApproval(false)
        // }
      } catch (e) {
        setRequestedApproval(false)
        console.error(e)
        toastError(t('Error'), t('Please try again. Confirm the transaction and make sure you are paying enough gas!'))
      }
    }, [currency, account, library, request, t, toastError, toastSuccess, reverseBridgeParams])

    return { handleApprove, requestedApproval, approvalComplete } */
  }

  /* private useCheckFaucetStatus(currency, valid, destination) {
    const [isFaucetAvailable, setIsFaucetAvailable] = useState(false)

    useEffect(() => {
      const checkFaucetStatus = async () => {
        if (!valid) { setIsFaucetAvailable(false); return }
        if (destination !== 20) { setIsFaucetAvailable(false); return }
        try {
          const responseGet = await fetch(`${BRIDGE_FAUCET_API}/faucet/${account}`);
          if (responseGet.ok) {
            const dataSuccessGet = await responseGet.json();
            if (dataSuccessGet.has_use_faucet === false) {
              setIsFaucetAvailable(true)
            } else {
              setIsFaucetAvailable(false)
            }
          }
        } catch (error) {
          console.error(JSON.stringify(error))
        }
      }
      checkFaucetStatus()
    }, [account, valid, destination])

    return isFaucetAvailable
  }*/

  private async callBridgeFaucet(txID: string, type: string, network: EVMNetwork, destAddress: string) {
    /* TODO try {
      const responseGet = await fetch(`${BRIDGE_FAUCET_API}/faucet/${destAddress}`);
      // console.log('response', responseGet)

      if (responseGet.ok) {
        const dataSuccessGet = await responseGet.json();

        if (dataSuccessGet.has_use_faucet === false) {
          const response = await fetch(`${BRIDGE_FAUCET_API}/faucet`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              txID: txID,
              chainID: chainID,
              address: destAddress,
              type: type
            }),
          });

          if (response.ok) {
            await response.json();
            await wait(5000);
            toastSuccess(t('0.01 ELA received from gas faucet!')); // dataSuccess?.success?.message
          } else {
            await response.json();
            await wait(5000);
            toastError(t('Error receiving faucet distribution')); // dataError?.error?.message
          }
        }
      }
    } catch (error) {
      console.error(JSON.stringify(error))
    }*/
  }

  // NOTE: from glide - No real idea what this is for now
  private parseValue(num: any, dec: number) {
    if (!num) {
      return window.BigInt(0);
    }

    const number = Number(num);
    const numberDec = this.countDecimals(number);
    const round = window.BigInt(10 ** Number(dec));
    const value =
      (window.BigInt(Math.floor(number * 10 ** numberDec)) * round) /
      window.BigInt(10 ** numberDec);
    return value;
  }

  // From glide
  private countDecimals(value: any) {
    if (Math.floor(value) === value) return 0;
    return value.toString().split('.')[1].length || 0;
  }

  /**
   * Checks if a token at a given address is NOT originated from that chain.
   * This differenciates the way tokens need to be wrapped in the destination chain, or reverted back to
   * the original tokem.
   */
  private foreignOrigin(address: string, chainId: number): boolean {
    const tokenInfo = bridgeableTokens.tokens.filter(token => token.address === address)[0];
    const { origin } = tokenInfo;

    if (origin !== chainId)
      return true;

    return false;
  }

  /**
 * From a human readable amount (short) to a chain amount (long)
 */
  private toChainHexAmount(readableAmount: BigNumber, decimals = 18): string {
    return '0x' + readableAmount.times(new BigNumber(10).pow(decimals)).toString(16);
  }

  /**
   * From a chain amount (long) to a human readable amount (short)
   */
  private toHumanReadableAmount(chainAmount: string | BigNumber, decimals = 18): BigNumber {
    return new BigNumber(chainAmount).dividedBy(new BigNumber(10).pow(decimals));
  }
}