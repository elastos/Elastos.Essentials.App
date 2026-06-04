import { getUserOpHash } from '@account-abstraction/utils';
import { hashPersonalMessage } from 'ethereumjs-util';
import { BigNumber, ethers } from 'ethers';
import { Logger } from 'src/app/logger';
import { AccountAbstractionService } from 'src/app/wallet/services/account-abstraction/account-abstraction.service';
import { BundlerService } from 'src/app/wallet/services/account-abstraction/bundler.service';
import { AccountAbstractionTransaction } from 'src/app/wallet/services/account-abstraction/model/account-abstraction-transaction';
import { UserOperation } from 'src/app/wallet/services/account-abstraction/model/user-operation';
import { EntryPoint__factory } from 'src/app/wallet/services/account-abstraction/typechain';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import {
  AccountAbstractionProvider,
  AccountAbstractionProviderChainConfig
} from '../../../../evms/account-abstraction-provider';
import { EVMNetwork } from '../../../../evms/evm.network';
import { AccountAbstractionNetworkWallet } from '../../../../evms/networkwallets/account-abstraction.networkwallet';

type PGAAChainConfig = AccountAbstractionProviderChainConfig & {
  gasErc20TokenAddress: string;
  gasErc20TokenDecimals: number;
};

const PG_AA_CHAIN_CONFIGS: PGAAChainConfig[] = [
  {
    chainId: 12343,
    entryPointAddress: '0x8308DF3bb308A669942220614032098BbE62E11A',
    bundlerRpcUrl: 'https://bundle.pgpgas.org/rpc',
    paymasterAddress: '0x8152557DD7d8dBFa2E85EaE473f8B897a5b6CCA9',
    factoryAddress: '0x3fDA83ab9564eC18Cb413f4bdf83e2789DD7D173',
    gasErc20TokenAddress: '0x8152557DD7d8dBFa2E85EaE473f8B897a5b6CCA9', // PGA - same as paymaster...
    gasErc20TokenDecimals: 18 // PGA
  }
  // TEST
  // {
  //   chainId: 12343,
  //   entryPointAddress: '0x8308DF3bb308A669942220614032098BbE62E11A',
  //   bundlerRpcUrl: 'https://bundler.eadd.co/rpc',
  //   paymasterAddress: '0x0348E7c415cE40188f3e2AFf5d2f936d28D791cb',
  //   factoryAddress: '0x3fDA83ab9564eC18Cb413f4bdf83e2789DD7D173',
  //   gasErc20TokenAddress: '0x0348E7c415cE40188f3e2AFf5d2f936d28D791cb', // Test PGA - same as paymaster...
  //   gasErc20TokenDecimals: 18 // Test PGA
  // }
];

/**
 * PG AA Account Provider for ECO chain
 * Implements Account Abstraction functionality specific to the PG implementation.
 *
 * The specificity of this provider is to have the PGA (that can be used to pay the paymaster for gas)
 * token mixed with the paymaster contract. This way, users with this kind of contract can avoid having native
 * ELA, but instead, they need to send PGA tokens to their AA account. PGA on thri account will be automatically
 * transfered to the paymaster when executing a transaction.
 */
export class PGAccountAbstractionProvider extends AccountAbstractionProvider<PGAAChainConfig> {
  constructor() {
    super('pg', 'PG Protocol', PG_AA_CHAIN_CONFIGS);
  }

  /**
   * Get the AA account address for a given EOA account on a specific chain by asking the contract itself.
   *
   * @param eoaAddress The EOA address
   * @param chainId The chain ID
   * @returns Promise resolving to the AA account address
   */
  async fetchAccountAddress(eoaAddress: string, chainId: number): Promise<string> {
    Logger.log('wallet', `PGAAAccountProvider: Getting AA account address for EOA ${eoaAddress} on chain ${chainId}`);

    // Check if chain is supported
    if (!this.supportsChain(chainId)) {
      return Promise.reject(new Error(`Chain ${chainId} is not supported by PG AA Account Provider`));
    }

    // Get the chain configuration
    const chainConfig = this.supportedChains.find(chain => chain.chainId === chainId);

    if (!chainConfig) {
      throw new Error(`Chain configuration not found for chain ${chainId}`);
    }

    // Retrieve network for given chain id.
    const network = WalletNetworkService.instance.getNetworkByChainId(chainId);
    if (!network) {
      throw new Error(`Network not found for chain ${chainId}`);
    }

    // Create provider and signer
    const originalProvider = network.getJsonRpcProvider();

    const entryPoint = EntryPoint__factory.connect(chainConfig.entryPointAddress, originalProvider);

    const initCode = AccountAbstractionService.instance.getAccountInitCode(
      network,
      eoaAddress,
      chainConfig.factoryAddress
    );

    let senderAddress: string;
    try {
      await entryPoint.callStatic.getSenderAddress(initCode);
      Logger.error(
        'wallet',
        `PGAAAccountProvider: senderAddress success from direct call, abnormal, it should always revert!`
      );
    } catch (e: any) {
      if (e.errorArgs && e.errorArgs.sender) {
        senderAddress = e.errorArgs.sender;
      } else {
        Logger.log('wallet', `PGAAAccountProvider: No sender in error args, full error:`, e);
        throw e;
      }
    }

    return senderAddress;
  }

  public async bundleAndSignTransaction(
    networkWallet: AccountAbstractionNetworkWallet,
    transaction: AccountAbstractionTransaction
  ): Promise<UserOperation> {
    // Services
    const aaService = AccountAbstractionService.instance;

    // Inits
    const network = networkWallet.network;
    const aaAddress = networkWallet.getAccountAbstractionAddress();
    const eoaControllerNetworkWallet = await networkWallet.getControllerNetworkWallet();
    const eoaControllerAddress = eoaControllerNetworkWallet.getAddresses()[0].address;
    const chainConfig = this.getSupportedChain(network.getMainChainID());

    Logger.log('wallet', 'PG provider is starting to bundle transaction.');
    Logger.log('wallet', 'AA address:', aaAddress);
    Logger.log('wallet', 'EOA controller address:', eoaControllerAddress);
    Logger.log('wallet', 'Transaction', transaction);

    const callData = aaService.encodeExecute(transaction.to, transaction.value, transaction.data);
    Logger.log('wallet', 'Execute-encoded call data:', callData);

    const paymasterAndData = chainConfig.paymasterAddress; // Just the address for noz (zehua)

    const provider = network.getJsonRpcProvider();

    Logger.log('Wallet', 'Fetching remote information...');
    const [aaCode, _initCode, nonce, gasPrice, feeData] = await Promise.all([
      provider.getCode(aaAddress),
      aaService.getAccountInitCode(network, eoaControllerAddress, chainConfig.factoryAddress),
      aaService.getNonce(network, chainConfig.entryPointAddress, aaAddress),
      provider.getGasPrice(),
      provider.getFeeData()
    ]);

    const aaAccountIsDeployed = aaCode !== '0x';
    Logger.log('Wallet', 'Deployed?', aaAccountIsDeployed);
    Logger.log('wallet', 'Init code:', _initCode);
    Logger.log('wallet', 'Nonce:', nonce);

    // Only use init code when account is not deployed. WHen deployed, we should always use 0x.
    const initCode = aaAccountIsDeployed ? '0x' : _initCode;

    let partialUserOp: Omit<UserOperation, 'signature'> = {
      sender: aaAddress,
      nonce,
      initCode,
      callData,
      callGasLimit: '0x1',
      verificationGasLimit: '0x1',
      preVerificationGas: ethers.BigNumber.from(1).toHexString(), // uint256 as hex string
      maxFeePerGas: feeData.maxFeePerGas?.toHexString() || gasPrice.toHexString(),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toHexString() || gasPrice.toHexString(),
      paymasterAndData
    };

    Logger.log('wallet', 'Partial user op:', partialUserOp);

    // Estimate gas using our own method
    const gasEstimation = await this.estimateUserOpGas(network, chainConfig, partialUserOp);
    Logger.log('wallet', 'Gas estimation results:', gasEstimation);

    // Update partial user op with our gas estimates
    partialUserOp = {
      ...partialUserOp,
      callGasLimit: gasEstimation.callGasLimit.toHexString(),
      verificationGasLimit: gasEstimation.verificationGasLimit.toHexString(),
      preVerificationGas: gasEstimation.preVerificationGas.toHexString(),
      maxFeePerGas: gasEstimation.maxFeePerGas.toHexString(),
      maxPriorityFeePerGas: gasEstimation.maxPriorityFeePerGas.toHexString()
    };

    const userOpForHash = {
      ...partialUserOp,
      accountGasLimits: ethers.utils.hexZeroPad('0x1', 32), // bytes32
      gasFees: ethers.utils.hexZeroPad('0x1', 32), // bytes32 - dummy value
      signature: '0x' // Dummy value when getting hash
    };

    Logger.log('wallet', 'Getting user op hash for op:', userOpForHash);

    const calculatedUserOpHash = getUserOpHash(userOpForHash, chainConfig.entryPointAddress, network.getMainChainID());

    Logger.log('wallet', 'User op hash:', calculatedUserOpHash);

    // For ERC-4337, we need to sign the Ethereum signed message hash
    // This matches the behavior expected by SimpleAccount._validateSignature
    // which does: bytes32 hash = userOpHash.toEthSignedMessageHash()
    const userOpHashBytes = Buffer.from(calculatedUserOpHash.substring(2), 'hex');
    const ethSignedMessageHash = hashPersonalMessage(userOpHashBytes);

    let signature = await eoaControllerNetworkWallet.signDigest(
      eoaControllerAddress,
      ethSignedMessageHash.toString('hex'),
      null
    );
    console.log('wallet', 'TEMP Signature:', signature);

    if (!signature) {
      throw new Error('Failed to sign user op hash');
    }

    const fullUserOp: UserOperation = { ...partialUserOp, signature };
    return fullUserOp;
  }

  /**
   * Estimates gas for a user operation using available services
   *
   * @param network The network to estimate gas on
   * @param partialUserOp The partial user operation to estimate gas for
   * @returns Promise resolving to gas estimation results
   */
  public async estimateUserOpGas(
    network: EVMNetwork,
    config: PGAAChainConfig,
    partialUserOp: Omit<UserOperation, 'signature'>
  ): Promise<{
    totalGas: BigNumber;
    callGasLimit: BigNumber;
    verificationGasLimit: BigNumber;
    preVerificationGas: BigNumber;
    estimatedCost: BigNumber;
    pgaCost: BigNumber;
    gasPrice: BigNumber;
    maxFeePerGas: BigNumber;
    maxPriorityFeePerGas: BigNumber;
    ethPerTokenRate: BigNumber;
  }> {
    try {
      Logger.log('wallet', 'Starting UserOperation Gas estimation...');

      // Get services
      const chainConfig = this.getSupportedChain(network.getMainChainID());
      const provider = network.getJsonRpcProvider();

      Logger.log('wallet', 'Partial user op for estimation:', partialUserOp);

      // Create custom paymaster contract interface for ethPerTokenRate
      const paymasterAbi = ['function ethPerTokenRate() view returns (uint256)'];
      const paymasterContract = new ethers.Contract(chainConfig.paymasterAddress, paymasterAbi, provider);

      // Run independent async operations in parallel
      const [gasPrice, feeData, callGasLimit, verificationGasLimit, ethPerTokenRate] = await Promise.all([
        // Gas price
        provider.getGasPrice(),
        // Fee data
        provider.getFeeData(),
        // Gas for "execute" operation
        (async () => {
          try {
            Logger.log('wallet', 'Estimating gas for "execute"');
            const gasLimit = await provider.estimateGas({
              from: config.entryPointAddress,
              to: partialUserOp.sender,
              data: partialUserOp.callData
            });
            Logger.log('wallet', 'Estimated execute gas:', gasLimit.toString());
            return gasLimit;
          } catch (error) {
            Logger.warn('wallet', 'Failed to estimate execute gas, using default:', error);
            return BigNumber.from(100000); // Default fallback
          }
        })(),
        // verificationGasLimit
        (async () => {
          const gasLimit = await this.estimateVerificationGasLimit(network, partialUserOp);
          Logger.log('wallet', 'Estimated verificationGasLimit:', gasLimit.toString());
          return gasLimit;
        })(),
        // ethPerTokenRate
        (async () => {
          const rate = await paymasterContract.ethPerTokenRate();
          Logger.log('wallet', 'Paymaster ethPerTokenRate:', rate.toString());
          return rate;
        })()
      ]);

      Logger.log('wallet', 'Current network Gas price:', gasPrice.toString());
      Logger.log('wallet', 'Fee data:', feeData);

      // Create UserOperation with dummy NON-ZERO signature to avoid underestimating calldata gas cost
      // SDK uses non-zero bytes when signature is missing; we simulate that explicitly here
      const userOpForCalculation = {
        ...partialUserOp,
        signature: '0x' + '1'.repeat(130)
      };

      // Use AA SDK to get the preVerificationGas
      const preVerificationGas = BundlerService.instance.calculatePreVerificationGas(userOpForCalculation);

      Logger.log('wallet', 'PreVerificationGas calculation:', {
        preVerificationGas: preVerificationGas.toString(),
        userOpCallData: userOpForCalculation.callData.substring(0, 10) + '...' // Show first 10 chars
      });

      // Use calculated preVerificationGas (with small safety buffer) and estimated callGasLimit.
      // It's unclear why the AA SDK calculation method returns a too low value. It's possibly
      // "normal" for some bundlers to require a overhead, as the SDK has "GasOverheads" capabilities...
      const preVerificationGasWithBuffer = BigNumber.from(preVerificationGas).add(10000);
      const estimates = {
        preVerificationGas: preVerificationGasWithBuffer.toHexString(),
        verificationGasLimit: verificationGasLimit.toHexString(),
        callGasLimit: callGasLimit.toHexString()
      };

      Logger.log('wallet', 'Real gas estimates from SimpleAccount:', estimates);

      // Calculate total gas
      const totalGas = BigNumber.from(estimates.preVerificationGas)
        .add(estimates.verificationGasLimit)
        .add(estimates.callGasLimit);

      Logger.log('wallet', 'Total gas:', totalGas.toString());

      // Calculate estimated cost
      const estimatedCost = totalGas.mul(gasPrice);
      const pgaCost = estimatedCost.mul(ethPerTokenRate).div(10000);

      Logger.log('wallet', 'Gas estimation results:');
      Logger.log('wallet', '   Call Gas Limit:', estimates.callGasLimit);
      Logger.log('wallet', '   Verification Gas Limit:', estimates.verificationGasLimit);
      Logger.log('wallet', '   PreVerification Gas:', estimates.preVerificationGas);
      Logger.log('wallet', '   Total Gas usage:', totalGas.toString());
      Logger.log('wallet', '   Estimated cost:', ethers.utils.formatEther(estimatedCost), 'ELA');
      Logger.log('wallet', '   PGA cost:', ethers.utils.formatEther(pgaCost), 'PGA');

      return {
        totalGas,
        callGasLimit: BigNumber.from(estimates.callGasLimit),
        verificationGasLimit: BigNumber.from(estimates.verificationGasLimit),
        preVerificationGas: BigNumber.from(estimates.preVerificationGas),
        estimatedCost,
        pgaCost,
        gasPrice,
        maxFeePerGas: feeData.maxFeePerGas || gasPrice,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || gasPrice,
        ethPerTokenRate
      };
    } catch (error) {
      Logger.error('wallet', 'Gas estimation failed:', error);
      throw error;
    }
  }

  /**
   * Depending on whether the AA is deployed or not, the verification gas is different.
   * Deployment consumes more gas.
   */
  private async estimateVerificationGasLimit(
    network: EVMNetwork,
    partialUserOp: Omit<UserOperation, 'signature'>
  ): Promise<BigNumber> {
    const baseVerificationGasLimit = BigNumber.from(100000);

    const aaIsDeployed = partialUserOp.initCode === '0x';
    if (aaIsDeployed) {
      return baseVerificationGasLimit;
    } else {
      // Not deployed yet, get creation cost.
      const provider = network.getJsonRpcProvider();

      Logger.log('wallet', 'Estimating creation gas');
      const deployerAddress = partialUserOp.initCode.substring(0, 42);
      const deployerCallData = '0x' + partialUserOp.initCode.substring(42);
      const creationGas = await provider.estimateGas({ to: deployerAddress, data: deployerCallData });
      Logger.log('wallet', `Creation gas cost: ${creationGas.toString()}`);

      return baseVerificationGasLimit.add(creationGas);
    }
  }

  public async publishTransaction(
    networkWallet: AccountAbstractionNetworkWallet,
    fullUserOp: UserOperation
  ): Promise<string> {
    const bundlerService = BundlerService.instance;
    const network = networkWallet.network;
    const chainConfig = this.getSupportedChain(network.getMainChainID());

    Logger.log('wallet', 'Sending full user op:', fullUserOp);

    // Send UserOp to bundler and get UserOpHash
    const submittedUserOpHash = await bundlerService.sendUserOpToBundler(
      fullUserOp,
      chainConfig.entryPointAddress,
      chainConfig.bundlerRpcUrl
    );
    Logger.log('wallet', 'UserOp sent successfully, user op hash:', submittedUserOpHash);

    // Wait for the UserOp to be mined and get the actual transaction hash
    Logger.log('wallet', 'Waiting for UserOp to be mined...');
    const userOpReceipt = await bundlerService.getUserOperationReceipt(submittedUserOpHash, chainConfig.bundlerRpcUrl);

    // Check if the user operation was successful
    if (!userOpReceipt.success) {
      const reason = userOpReceipt.reason || 'Unknown failure reason';
      Logger.error('wallet', `UserOp execution failed: ${reason}`);
      throw new Error(`User operation failed: ${reason}`);
    }

    const transactionHash = userOpReceipt.receipt.transactionHash;
    Logger.log('wallet', 'UserOp executed successfully! Receipt:', userOpReceipt);

    return transactionHash;
  }

  /**
   * Signs a digest using the underlying EOA controller wallet.
   * This delegates to the EOA safe's signDigest method.
   */
  public async signDigest(
    networkWallet: AccountAbstractionNetworkWallet,
    address: string,
    digest: string,
    password: string
  ): Promise<string> {
    Logger.log('wallet', 'PG AA Provider: Signing digest:', digest, 'for address:', address);

    try {
      // Get the EOA controller network wallet
      const eoaControllerNetworkWallet = await networkWallet.getControllerNetworkWallet();

      if (!eoaControllerNetworkWallet) {
        throw new Error('Cannot sign digest: EOA controller network wallet not found');
      }

      Logger.log('wallet', 'PG AA Provider: EOA controller network wallet found:', {
        masterWalletId: eoaControllerNetworkWallet.masterWallet.id,
        masterWalletType: eoaControllerNetworkWallet.masterWallet.type,
        networkKey: eoaControllerNetworkWallet.network.key
      });

      // Delegate to the EOA safe's signDigest method
      const signature = await eoaControllerNetworkWallet.signDigest(address, digest, null);

      if (!signature) {
        Logger.warn('wallet', 'PG AA Provider: EOA safe returned null signature');
        return null;
      }

      Logger.log('wallet', 'PG AA Provider: Successfully signed digest');
      return signature;
    } catch (error) {
      Logger.error('wallet', 'PG AA Provider: signDigest error:', {
        errorMessage: error.message,
        errorStack: error.stack,
        address,
        digestLength: digest ? digest.length : 'undefined',
        hasPassword: !!password
      });
      throw error;
    }
  }
}
