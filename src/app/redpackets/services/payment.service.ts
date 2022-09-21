import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import moment from 'moment';
import { Logger } from 'src/app/logger';
import { IdentityEntry } from 'src/app/model/didsessions/identityentry';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { environment } from 'src/environments/environment';
import { TokenType } from '../model/packets.model';
import { NotifyPaymentStatus } from '../model/payments.model';
import { DIDSessionsStore } from './../../services/stores/didsessions.store';

/**
 * Type of token paid
 */
export enum PaymentType {
  ERC20_TOKEN = "erc20",
  NATIVE_TOKEN = "native"
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
  }

  public init() {
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
    this.state = await this.storage.getSetting<PaymentsState>(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "redpackets", "paymentstate", {
      payments: []
    });
  }

  private saveState(): Promise<void> {
    return this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "redpackets", "paymentstate", this.state);
  }

  /**
   * Adds a new payment entry
   */
  public createPayment(packetHash: string, transactionHash: string, type: PaymentType): Promise<void> {
    if (this.getPaymentByTransactionHash(transactionHash)) {
      Logger.warn("redpackets", `Trying to create a payment with an already existing transaction hash ${transactionHash}! Skipping, check this`);
      return;
    }

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

  public getPaymentByTransactionHash(transactionHash: string): Payment {
    return this.state.payments.find(p => p.transactionHash === transactionHash);
  }

  /**
   * Let the red packet service know that a payment was made
   */
  public async notifyServiceOfPayment(packetHash: string, transactionHash: string, tokenType: TokenType): Promise<NotifyPaymentStatus> {
    try {
      let response = await this.http.post<NotifyPaymentStatus>(`${environment.RedPackets.serviceUrl}/packets/${packetHash}/notifypayment`, {
        transactionHash,
        tokenType // native or erc20
      }).toPromise();

      if (response) {
        if (response.confirmed) {
          Logger.log("redpackets", "Payment confirmed by the service. Marking it as completed locally", packetHash, transactionHash, response.payment);
          // Service has confirmed the payment was well received.
          await this.setPaymentConfirmedByService(transactionHash);
        }
        else {
          Logger.warn("redpackets", "Payment NOT confirmed by the service!", packetHash, transactionHash, response.errorMessage);
        }
        return response;
      }
      else {
        Logger.error("redpackets", "Notify payment: payment could not be confirmed", response);
        return null;
      }
    }
    catch (err) {
      Logger.error("redpackets", "Notify payment failure", err);
      return null;
    }
  }
}
