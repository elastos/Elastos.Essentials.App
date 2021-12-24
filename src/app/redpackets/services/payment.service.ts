import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import moment from 'moment';
import { GlobalConfig } from 'src/app/config/globalconfig';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { GlobalStorageService } from 'src/app/services/global.storage.service';

/**
 * Type of token paid
 */
export enum PaymentType {
  ERC20_TOKEN = "erc20",
  NATIVE_TOKEN = "native"
}

type NotifyPaymentResponse = {
  confirmed: boolean; // Whether the payment is received/confirmed/remembered by the backend
}

type Payment = {
  createdAt: number; // Creation timestamp for this payment
  packetHash: string; // Hash of the target red packet
  transactionHash: string; // Hash of the payment transaction published on chain
  // Whether we got the confirmation that the service got this payment. while such
  // confirmation is not received, we keep trying to let the backend know.
  // If confirmed, this field holds the confirmation date as timestamp.
  confirmedByServiceAt: number;
  type: PaymentType; // Payment in ERC20 token or in native coin?
}

type PaymentsState = {
  payments: Payment[];
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService implements GlobalService {
  private state: PaymentsState = null;

  constructor(private storage: GlobalStorageService, private http: HttpClient) {
    GlobalServiceManager.getInstance().registerService(this);
  }

  async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    await this.loadState();
  }

  onUserSignOut(): Promise<void> {
    return;
  }

  /**
   * Loads on going payments state from disk
   */
  private async loadState(): Promise<void> {
    this.state = await this.storage.getSetting<PaymentsState>(GlobalDIDSessionsService.signedInDIDString, "redpackets", "paymentstate", {
      payments: []
    });
  }

  private saveState(): Promise<void> {
    return this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "redpackets", "paymentstate", this.state);
  }

  /**
   * Adds a new payment entry
   */
  public createPayment(packetHash: string, transactionHash: string, type: PaymentType): Promise<void> {

    todo: ensure txhash not already in list

    this.state.payments.push({
      createdAt: moment().unix(),
      packetHash,
      transactionHash,
      type,
      confirmedByServiceAt: null
    });
    return this.saveState();
  }

  /**
   * Remember that the payment was well received by the red packet service.
   */
  public setPaymentConfirmedByService(transactionHash: string): Promise<void> {
    let payment = this.getPaymentByTransactionHash(transactionHash);
    payment.confirmedByServiceAt = moment().unix();
    return this.saveState();
  }

  private getPaymentByTransactionHash(transactionHash: string): Payment {
    return this.state.payments.find(p => p.transactionHash === transactionHash);
  }

  /**
   * Let the red packet service know that a payment was made
   */
  public async notifyServiceOfPayment(packetHash: string, transactionHash: string): Promise<void> {
    try {
      let response = await this.http.post<NotifyPaymentResponse>(`${GlobalConfig.RedPackets.serviceUrl}/packets/${packetHash}/notifypayment`, {
        transactionHash
      }).toPromise();
      console.log("notify payment response", response);

      if (response.confirmed) {
        // Service has confirmed the payment was well received. 
      }
    }
    catch (err) {
      Logger.error("redpackets", "Notify payment failure", err);
    }
  }
}
