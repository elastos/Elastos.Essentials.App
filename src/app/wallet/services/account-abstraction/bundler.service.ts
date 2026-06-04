import { calcPreVerificationGas } from '@account-abstraction/sdk';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { JsonRpcResponse } from '../../model/json-rpc';
import { UserOperation } from './model/user-operation';

type UserOperationReceipt = {
  userOpHash: string;
  sender: string;
  nonce: string;
  actualGasCost: string;
  actualGasUsed: string;
  success: boolean;
  reason?: string;
  logs: Array<{
    transactionIndex: string;
    blockNumber: string;
    transactionHash: string;
    address: string;
    topics: string[];
    data: string;
    logIndex: string;
    blockHash: string;
  }>;
  receipt: {
    to: string;
    from: string;
    contractAddress: string | null;
    transactionIndex: string;
    gasUsed: string;
    logsBloom: string;
    blockHash: string;
    transactionHash: string;
    logs: Array<{
      transactionIndex: string;
      blockNumber: string;
      transactionHash: string;
      address: string;
      topics: string[];
      data: string;
      logIndex: string;
      blockHash: string;
    }>;
    blockNumber: string;
    confirmations: string;
    cumulativeGasUsed: string;
    status: string;
    type: string;
    byzantium: boolean;
  };
};

@Injectable({
  providedIn: 'root'
})
export class BundlerService {
  public static instance: BundlerService;

  constructor(private http: HttpClient) {
    BundlerService.instance = this;
  }

  public async sendUserOpToBundler(userOp: UserOperation, entryPoint: string, bundlerUrl: string): Promise<string> {
    const body = { jsonrpc: '2.0', id: 1, method: 'eth_sendUserOperation', params: [userOp, entryPoint] };
    const response = await this.http
      .post<JsonRpcResponse<string>>(bundlerUrl, body, { headers: { 'content-type': 'application/json' } })
      .toPromise();

    if (!response?.result) {
      Logger.error('wallet', response?.error);
      throw new Error('No valid result returned by sendUserOpToBundler response');
    }

    return response.result; // userOpHash
  }

  /**
   * Gets the receipt for a user operation by polling the bundler
   * @param userOpHash The hash of the user operation
   * @param bundlerUrl The bundler RPC URL
   * @param maxAttempts Maximum number of polling attempts (default: 30)
   * @param pollingInterval Polling interval in milliseconds (default: 2000ms)
   * @returns Promise resolving to the UserOperationReceipt containing the actual transaction hash
   */
  public async getUserOperationReceipt(
    userOpHash: string,
    bundlerUrl: string,
    maxAttempts = 30,
    pollingInterval = 2000
  ): Promise<UserOperationReceipt> {
    Logger.log('wallet', `Polling for UserOperation receipt for hash: ${userOpHash}`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const body = {
          jsonrpc: '2.0',
          id: attempt,
          method: 'eth_getUserOperationReceipt',
          params: [userOpHash]
        };

        const response = await this.http
          .post<JsonRpcResponse<UserOperationReceipt>>(bundlerUrl, body, {
            headers: { 'content-type': 'application/json' }
          })
          .toPromise();

        if (response?.result) {
          Logger.log('wallet', `UserOperation receipt found after ${attempt} attempts`);
          return response.result;
        }

        Logger.log('wallet', `Attempt ${attempt}/${maxAttempts}: UserOperation not yet mined, waiting...`);
        await this.delay(pollingInterval);
      } catch (error) {
        Logger.error('wallet', `Error polling UserOperation receipt (attempt ${attempt}):`, error);
        if (attempt === maxAttempts) {
          throw new Error(`Failed to get UserOperation receipt after ${maxAttempts} attempts: ${error}`);
        }
        await this.delay(pollingInterval);
      }
    }

    throw new Error(`UserOperation receipt not found after ${maxAttempts} attempts`);
  }

  /**
   * Calculates preVerificationGas using the official AA SDK implementation.
   * This follows the same logic as used by popular bundlers and avoids arbitrary floors.
   */
  public calculatePreVerificationGas(userOp: UserOperation): number {
    const partial = {
      sender: userOp.sender,
      nonce: userOp.nonce,
      initCode: userOp.initCode,
      callData: userOp.callData,
      callGasLimit: userOp.callGasLimit,
      verificationGasLimit: userOp.verificationGasLimit,
      maxFeePerGas: userOp.maxFeePerGas,
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
      paymasterAndData: userOp.paymasterAndData,
      signature: userOp.signature
    } as unknown as Parameters<typeof calcPreVerificationGas>[0];

    return calcPreVerificationGas(partial);
  }

  /**
   * Utility method to create a delay
   * @param ms Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
