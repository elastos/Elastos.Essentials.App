import { Injectable } from "@angular/core";
import BigNumber from "bignumber.js";
import { sleep } from "src/app/helpers/sleep.helper";
import { Logger } from "src/app/logger";
import { EVMNetwork } from "src/app/wallet/model/networks/evms/evm.network";
import { EVMNetworkWallet } from "src/app/wallet/model/networks/evms/networkwallets/evm.networkwallet";
import { EVMSafe } from "src/app/wallet/model/networks/evms/safes/evm.safe";
import { AnyMainCoinEVMSubWallet } from "src/app/wallet/model/networks/evms/subwallets/evm.subwallet";
import { AddressUsage } from "src/app/wallet/model/safes/addressusage";
import { Transfer } from "src/app/wallet/services/cointransfer.service";
import { ERC20CoinService } from "src/app/wallet/services/evm/erc20coin.service";
import { EVMService } from "src/app/wallet/services/evm/evm.service";
import { WalletNetworkService } from "src/app/wallet/services/network.service";
import { WalletService } from "src/app/wallet/services/wallet.service";
import { Contract } from "web3-eth-contract";
import { availableBridges } from "../config/bridges";
import { bridgeableTokens } from "../config/bridgetokens";
import { ChainInfo } from "../model/bridge";
import { BridgeableToken } from "../model/bridgeabletoken";
import { UsableToken } from "../model/usabletoken";

export const BRIDGE_FAUCET_API = 'https://api.glidefinance.io'
export const VALIDATOR_TIMEOUT = 300000 // Milliseconds

type BridgeType = "native" | "token";

/**
 * This bridge service uses TOKBRIDGE / SHADOWTOKEN (Elastos network)
 */
@Injectable({
  providedIn: "root"
})
export class EasyBridgeService {

  // TEMP
  private tokenToBridge = bridgeableTokens.tokens[1] // TEMP - native HT from heco
  private amount = 0.15;

  constructor(
    private walletManager: WalletService,
    private networkService: WalletNetworkService,
    private evmService: EVMService,
    private erc20CoinService: ERC20CoinService,
  ) { }

  public async fetchBridgeableBalances(walletAddress: string): Promise<UsableToken[]> {
    for (let token of bridgeableTokens.tokens) {
      let network = <EVMNetwork>this.networkService.getNetworkByChainId(token.chainId);
      let web3 = await this.evmService.getWeb3(network);

      let balance: BigNumber;
      if (token.isNative)
        await this.erc20CoinService.fetchERC20TokenBalance(network, token.address, walletAddress);
      else {
        let balanceString = await web3.eth.getBalance(walletAddress);
        balance = new BigNumber(balanceString);
      }
      console.log(token)
    }
    return null;
  }

  // TODO: MOVE TO UI
  public async bridgeTokensTest() {
    console.log("Token to bridge:", this.tokenToBridge);

    const sourceNetwork = <EVMNetwork>this.networkService.getNetworkByChainId(this.tokenToBridge.chainId);
    const destinationNetwork = <EVMNetwork>this.networkService.getNetworkByChainId(20); // TMP - Bridge to ESC
    const bridgeSelected = `${sourceNetwork.getMainChainID()}_${destinationNetwork.getMainChainID()}`;
    const bridgeDestinationSelected = `${destinationNetwork.getMainChainID()}_${sourceNetwork.getMainChainID()}`;

    // TODO: make this more dynamic...
    let bridgeType: BridgeType;
    if (this.tokenToBridge.symbol === 'ELA' || this.tokenToBridge.symbol === 'ETH' || this.tokenToBridge.symbol === 'HT')
      bridgeType = "native";
    else
      bridgeType = "token";

    const bridgeParams = availableBridges[bridgeSelected][bridgeType][sourceNetwork.getMainChainID()];
    const bridgeParamsOtherSide = availableBridges[bridgeSelected][bridgeType][destinationNetwork.getMainChainID()];
    const reverseBridgeParams = availableBridges[bridgeDestinationSelected][bridgeType][sourceNetwork.getMainChainID()];
    const reverseBridgeParamsOtherSide = availableBridges[bridgeDestinationSelected][bridgeType][destinationNetwork.getMainChainID()];

    // Get the active master wallet ID (the currently selected one in essentials)
    let sourceMasterWalletId = this.walletManager.activeMasterWalletId;
    console.log("Source master wallet ID:", sourceMasterWalletId);
    let sourceMasterWallet = this.walletManager.getMasterWallet(sourceMasterWalletId);

    // Get a network wallet for the target source chain - don't launch its background services
    let sourceNetworkWallet = await sourceNetwork.createNetworkWallet(sourceMasterWallet, false);
    console.log("Source network wallet:", sourceNetworkWallet);
    if (!(sourceNetworkWallet instanceof EVMNetworkWallet))
      throw new Error("Easy bridge service can only be used with EVM networks");

    let needsApproval = await this.checkNeedsMediatorApproval(sourceNetworkWallet.getMainEvmSubWallet(), this.tokenToBridge, bridgeParams, new BigNumber(this.amount), reverseBridgeParams);
    // WAS const needsApproval = useCheckMediatorApprovalStatus(tokenToBridge, bridgeParams, amountToBridge, reverseBridgeParams)
    console.log("needsApproval", needsApproval);


    /* TODO const { handleApprove, requestedApproval, approvalComplete } = useApproveMediator(
      tokenToBridge,
      bridgeParams,
      reverseBridgeParams,
    ) */


    // do coin transfer
    try {
      await this.coinTransfer(sourceNetworkWallet.getMainEvmSubWallet(), this.tokenToBridge, bridgeParams, new BigNumber(this.amount), bridgeType,
        reverseBridgeParams, reverseBridgeParamsOtherSide, sourceNetwork,
        destinationNetwork, bridgeParamsOtherSide);
    } catch (e) {
      console.error(e)
      // TODO toastError(('Please try again. Confirm the transaction and make sure you are paying enough gas!'))
    }
  }

  private async coinTransfer(mainCoinSubWallet: AnyMainCoinEVMSubWallet, currency: BridgeableToken, request: ChainInfo, amount: BigNumber, bridgeType: string,
    destinationParams: any, reverseBridgeParamsOtherSide: any,
    sourceNetwork: EVMNetwork, destinationNetwork: EVMNetwork,
    destinationParamsOtherSide: any
  ) {

    // Get the active wallet address
    let accountAddress = await mainCoinSubWallet.getTokenAddress(AddressUsage.EVM_CALL);

    console.log("Bridging", currency, request, amount.toString(), accountAddress, sourceNetwork, destinationNetwork);

    const isToken = !currency.isNative;

    //const fromDestBlock = await this.evmService.getBlockNumber(destinationNetwork);
    const from = accountAddress;
    const recipient = accountAddress;
    const value = this.getDecimalAmount(amount, currency.decimals);

    Logger.log("easybridge", "Getting gas price");
    const gasPrice = await this.evmService.getGasPrice(sourceNetwork);

    if (amount.lt(request.minTx))  // TODO: improve
      throw new Error(`Amount ${amount} too low, min ${request.minTx}`);

    // if token, then call erc677Contract, otherwise nativeSourceMediator
    if (bridgeType === "token" && isToken) {
      const type = 'relayTokens';

      const mediator = this.foreignOrigin(currency.address, currency.chainId) ? destinationParams.contract : request.contract;
      const tokenDestinationMediator = this.foreignOrigin(currency.address, currency.chainId) ? reverseBridgeParamsOtherSide.contract : destinationParamsOtherSide.contract;

      const tokenSourceMediator = this.getNativeSourceMediator(sourceNetwork, mediator, accountAddress);

      Logger.log("easybridge", "Calling bridge method (case 1)");
      const receiptToken = await (await tokenSourceMediator).methods.relayTokens(currency.address, recipient, value).send({
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
      if (destinationNetwork.getMainChainID() === 20) {
        void this.callBridgeFaucet(receiptToken.hash, type, sourceNetwork, recipient);
      }

      // TODO await this.detectExchangeFinished(account, bridgeType, sourceNetwork, destNetwork, tokenDestinationMediator, destinationParamsOtherSide, receiptToken.hash, isToken, fromDestBlock);

    } else if (bridgeType === "native" && isToken) {
      const type = 'transferAndCall';
      const tokenSourceMediator = this.getErc677Contract(sourceNetwork, currency.address, accountAddress);

      Logger.log("easybridge", "Calling bridge method (case 2)");
      const receiptErc677 = await tokenSourceMediator["transferAndCall(address,uint256,bytes)"](destinationParams.contract, value, from, {
        from: from,
        gasPrice: gasPrice.toString()
      });
      await receiptErc677.wait(1);
      // TODO toastSuccess(t('Bridging in process. Awaiting relay from mediator.'));
      if (destinationNetwork.getMainChainID()) {
        void this.callBridgeFaucet(receiptErc677.hash, type, sourceNetwork, recipient);
      }

      /*  TODO await this.detectExchangeFinished(
         account,
         bridgeType,
         sourceNetwork,
         destNetwork,
         reverseBridgeParamsOtherSide.contract,
         destinationParamsOtherSide,
         receiptErc677.hash,
         isToken,
         fromDestBlock
       ); */

    } else {
      const type = 'relayTokens';
      const nativeSourceMediator = await this.getNativeSourceMediator(sourceNetwork, request.contract, accountAddress);

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
      let nonce = await this.evmService.getNonce(sourceNetwork, accountAddress);

      Logger.log("easybridge", "Creating unsigned transaction");
      let safe = <EVMSafe><unknown>mainCoinSubWallet.networkWallet.safe;
      let unsignedTx = await safe.createContractTransaction(request.contract, value, gasPrice, gasLimit, nonce, relayMethod.encodeABI());

      Logger.log("easybridge", "Created unsigned transaction", unsignedTx);

      Logger.log("easybridge", "Signing and sending transaction");
      const transfer = new Transfer();
      Object.assign(transfer, {
        masterWalletId: mainCoinSubWallet.networkWallet.masterWallet.id,
        subWalletId: mainCoinSubWallet.id,
      });
      let sendResult = await mainCoinSubWallet.signAndSendRawTransaction(unsignedTx, transfer, false);
      Logger.log("easybridge", "Signing and sending transaction result:", sendResult);

      /* const receiptNative =  .send({
        from: from,
        value: value
      });
      await sleep(1000); */

      // TODO toastSuccess(t('Bridging in process. Awaiting relay from mediator.'));
      if (destinationNetwork.getMainChainID()) {
        // TODO void this.callBridgeFaucet(receiptNative.hash, type, sourceNetwork, recipient);
      }

      // TODO await this.detectExchangeFinished(account, bridgeType, sourceNetwork, destNetwork, destinationParamsOtherSide.contract, destinationParamsOtherSide,  receiptNative.hash, isToken, fromDestBlock);
    }
  }

  private getDecimalAmount(amount: BigNumber, decimals = 18): string {
    return '0x' + amount.times(new BigNumber(10).pow(decimals)).toString(16);
  }

  // detect is destination exchange finished transfer
  private async detectExchangeFinished(recipient: any, bridgeType: string, sourceNetwork: number, destNetwork: number, sourceMediatorContract: string,
    destinationParamsOtherSide: any, txID: string, isToken: boolean, fromBlock: number) {

    /* TODO  const destProvider = new ethers.providers.JsonRpcProvider(networksUrl[destNetwork]);
     let sourceMediator;
     let tokensBridgedEvent;
     let eventAddressArgument;

     if (bridgeType === "native") {
       sourceMediator = this.getNativeSourceMediator(sourceMediatorContract, destProvider,);
       tokensBridgedEvent = ethers.utils.id("TokensBridged(address,uint256,bytes32)");
       eventAddressArgument = 0;
     } else {
       sourceMediator = this.getTokenSourceMediator(sourceMediatorContract, destProvider,);
       tokensBridgedEvent = ethers.utils.id("TokensBridged(address,address,uint256,bytes32)");
       eventAddressArgument = 1;
     }

     // get when transfer is finished
     const stopTime = Date.now() + VALIDATOR_TIMEOUT
     while (Date.now() <= stopTime) {
       const currentBlock = await destProvider.getBlockNumber();

       const logsNew = await sourceMediator.queryFilter({
         address: destinationParamsOtherSide.contract,
         topics: [tokensBridgedEvent]
       }, fromBlock, currentBlock);

       const confirmationEvent = logsNew.filter(event => event.args[eventAddressArgument] === recipient);

       if (confirmationEvent.length > 0) {
         // TODO toastSuccess(t('Transfer complete! You can now use your assets on the destination network.'));
         return;
       }

       if ((Date.now() + 177000) < stopTime && (Date.now() + 183000) > stopTime) { // 2 minutes elapsed, 3 minutes to go
         // TODO toastSuccess("Spinning, spinning, spinning...");
       }

       if ((Date.now() + 117000) < stopTime && (Date.now() + 123000) > stopTime) { // 3 minutes elapsed, 2 minutes to go
         // TODO toastSuccess("Ugh how long does this take?");
       }

       if ((Date.now() + 57000) < stopTime && (Date.now() + 63000) > stopTime) { // 4 minutes elapsed, 1 minute to go
         // TODO toastSuccess("We'll give it one more minute");
       }

       await sleep(5000);
     }

     if (Date.now() > stopTime) {
       // TODO toastError("Bridge completion event not detected within 5 minutes. Please monitor block explorer for receipt.");
     } */
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

  private async checkNeedsMediatorApproval(mainCoinSubWallet: AnyMainCoinEVMSubWallet, currency: BridgeableToken, request: ChainInfo, amount: BigNumber, reverseBridgeParams: any): Promise<boolean> {
    if (currency.isNative)
      return false;

    if (request === undefined)
      return false;

    let accountAddress = await mainCoinSubWallet.getTokenAddress(AddressUsage.EVM_CALL);
    let network = mainCoinSubWallet.networkWallet.network;

    const tokenContract = await this.getErc20Contract(network, currency.address, accountAddress);
    const mediator = this.foreignOrigin(currency.address, currency.chainId) ? reverseBridgeParams.contract : request.contract;

    try {
      const response = await tokenContract.methods.allowance(accountAddress, mediator).call();
      const currentAllowance = new BigNumber(response.toString())
      // console.log(currentAllowance.toString())
      const value = new BigNumber(this.parseValue(amount, currency.decimals).toString())
      // console.log(value.toString())
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

  private countDecimals(value: any) {
    if (Math.floor(value) === value) return 0;
    return value.toString().split('.')[1].length || 0;
  }

  /**
   * Checks if a token at a given address is NOT originated from that chain.
   * This differenciates the way tokens need to be wrapped in the destination chain, or reverted back to
   * the original tokem.
   */
  private foreignOrigin(address: string, chainId: number) {
    const tokenInfo = bridgeableTokens.tokens.filter(token => token.address === address)[0];
    const { origin } = tokenInfo;

    if (origin !== chainId)
      return true;

    return false;
  }
}