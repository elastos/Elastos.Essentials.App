import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { PopupService } from './popup.service';
import { Subject } from "rxjs";
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { ElastosSDKHelper } from 'src/app/helpers/elastossdk.helper';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { Events } from 'src/app/services/events.service';
import { GlobalHiveService, VaultLinkStatus } from 'src/app/services/global.hive.service';

export type PaidIncompleteOrder = {
    transactionId: string;
    vaultAddress: string;
    planName: string;
}

@Injectable({
  providedIn: 'root'
})
export class HiveService {
  private pricingInfo: HivePlugin.Payment.PricingInfo = null; // Cached pricing info for user's current vault provider after been fetched.

  private publicationCheckTimer: NodeJS.Timer = null;
  public publicationSubject: Subject<boolean> = new Subject();

  constructor(
    private router: Router,
    private storage: GlobalStorageService,
    private popup: PopupService,
    private events: Events,
    public translate: TranslateService,
    private globalIntentService: GlobalIntentService,
    private globalHiveService: GlobalHiveService,
    private didSessions: GlobalDIDSessionsService
  ) {}

  async init() {
  }

  stop() {
  }

  public getActiveVault(): HivePlugin.Vault {
    return this.globalHiveService.getActiveVault();
  }

  private async getLastPublishedTime(): Promise<Date> {
    let lastPublishedTime = await this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, 'hivemanager', "publicationrequesttime", 0);
    return new Date(lastPublishedTime);
  }

  private async saveLastPublishedTime(): Promise<void> {
    await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, 'hivemanager', "publicationrequesttime", Date.now());
  }

  public async getPricingInfo(): Promise<HivePlugin.Payment.PricingInfo> {
    if (this.pricingInfo)
      return this.pricingInfo;

    this.pricingInfo = await this.getActiveVault().getPayment().getPricingInfo();

    return this.pricingInfo;
  }

  /**
   *
   */
  public async purchasePlan(paymentSettings: HivePlugin.Payment.PaymentSettings, plan: HivePlugin.Payment.PricingPlan): Promise<void> {
    if (plan.getCurrency() != "ELA") {
      await this.popup.ionicAlert(this.translate.instant('hivemanager.alert.unavailable'), this.translate.instant('hivemanager.alert.only-payments-in-ELA'));
      return;
    }

    let operationSuccessful: boolean;
    if (plan.getCost() == 0) {
      // TODO: save that user doesn't want to renew his paid subscription.
      operationSuccessful = true;
    }
    else {
      try {
        // Pay using a wallet.
        let transactionID = await this.executePayment(plan.getCost(), await paymentSettings.getReceivingELAAddress())

        // TODO: save txid and (maybe? or create a new order to retry?) orderid to local storage until we are sure payOrder() was successful, to make sure we don't
        // loose any payment, then retry until it's successful.

        if (transactionID) {
          // Save the payment information locally.
          await this.savePaidIncompleteOrder(transactionID, this.getActiveVault().getVaultProviderAddress(), plan.getName());

          await this.notifyProviderOfPaidOrder(plan.getName(), transactionID);

          Logger.log("HiveManager", "Plan purchase completed successfully");

          operationSuccessful = true;
        }
        else {
          Logger.warn("HiveManager", "Payment failure");
          operationSuccessful = false;
        }
      }
      catch(e) {
        operationSuccessful = false;
      }
    }

    if (operationSuccessful) {
      await this.popup.ionicAlert(this.translate.instant('hivemanager.alert.completed'), this.translate.instant('hivemanager.alert.plan-has-been-configured'));
    }
    else {
      await this.popup.ionicAlert(this.translate.instant('hivemanager.alert.operation-not-completed-title'), this.translate.instant('hivemanager.alert.operation-not-completed-text'));
    }
  }

  private executePayment(cost: number, elaAddress: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
    return new Promise(async (resolve, reject)=>{
      try {
        let data: { result: { txid: string }} = await this.globalIntentService.sendIntent("https://wallet.elastos.net/pay", {
          amount: cost,
          receiver: elaAddress,
          currency: "ELA"
        });

        if (!data || !data.result || !data.result.txid) {
          // Cancelled or error
          reject();
        }
        else {
          // Success
          Logger.log("HiveManager", "Pay intent response data: ", data);
          resolve(data.result.txid);
        }
      }
      catch (err) {
        Logger.error("HiveManager", "Pay intent error: ", err);
        reject();
      }
    });
  }

  /**
   * Creates a new order and notifies that it has been paid (by giving the transaction id).
   */
  private async notifyProviderOfPaidOrder(planName: string, transactionID: string) {
    // Create a payment order
    let orderId = await this.getActiveVault().getPayment().placeOrder(planName);

    // Let the vault provider know which transaction IDs have been generated for the payment of this order.
    Logger.log("HiveManager", "Paying order on vault for transaction ID", transactionID);
    await this.getActiveVault().getPayment().payOrder(orderId, [transactionID]);

    Logger.log("HiveManager", "Order paid on the vault provider");

    await this.finalizePaidIncompleteOrder(transactionID);

    this.events.publish("plan-just-purchased");
  }

  /**
   * Checks if some payments have been done, without being able to complete the order, and retry the operation.
   * For example, user may have paid with the wallet, got a transaction ID, but in the end for any reason, the hive
   * node call to payOrder() has failed. In this case, the operation has to be retried to make sure the user
   * doesn't loose his payment.
   */
  public async tryToFinalizePreviousOrders(): Promise<void> {
    Logger.log("HiveManager", "Trying to finalize paid but incomplete orders");

    let incompleteOrders = await this.getPaidIncompleteOrders();
    if (incompleteOrders.length == 0) {
      // No incomplete order, nothing to finalize.
      Logger.log("HiveManager", "No incomplete order, nothing to do.");
      return;
    }
    else {
      // For each incomplete order, try to call payOrder() again.
      for (let order of incompleteOrders) {
        try {
          Logger.log("HiveManager", "Retrying to finalize paid incomplete order:", order);
          await this.notifyProviderOfPaidOrder(order.planName, order.transactionId);
          Logger.log("HiveManager", "Retried to finalize paid incomplete order successfully");
        }
        catch (e) {
          Logger.warn("HiveManager", "Retried to finalize paid incomplete order but failed again:", e);
        }
      }
    }
  }

  /**
   * And incomplete order is now finished and the hive node knows it. So we can safely delete it locally
   * and not retry anything later.
   */
  private async finalizePaidIncompleteOrder(transactionId: string) {
    Logger.log("HiveManager", "Finalizing paid incomplete order for transaction ID", transactionId);
    let pendingPaidOrders = await this.getPaidIncompleteOrders();

    Logger.log("HiveManager", "List of paid incomplete orders: ", pendingPaidOrders);
    let orderIndex = pendingPaidOrders.findIndex((order)=>{
      return order.transactionId == transactionId;
    });

    if (orderIndex == -1) {
      Logger.error('HiveManager', "Incomplete order not found in local storage for transaction ID "+transactionId+"!");
      return;
    }
    else {
      // Remove the pending order from our temporary list.
      pendingPaidOrders.splice(orderIndex, 1);
      Logger.log("HiveManager", "Removing the order from pending paid orders list because it's finalized. New pendingPaidOrders: ", pendingPaidOrders);
      await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, 'hivemanager', "pendingPaidOrders", pendingPaidOrders);
    }
  }

  /**
   * List of orders that have been actually paid by the user but not sent to the hive node.
   */
  public async getPaidIncompleteOrders(): Promise<PaidIncompleteOrder[]> {
    let pendingPaidOrders = await this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, 'hivemanager', "pendingPaidOrders", []) as PaidIncompleteOrder[];
    if (!pendingPaidOrders) {
      return [];
    }
    else {
      return pendingPaidOrders;
    }
  }

  private async savePaidIncompleteOrder(transactionId: string, vaultAddress: string, planName: string) {
    let pendingPaidOrders = await this.getPaidIncompleteOrders();
    pendingPaidOrders.push({
      transactionId: transactionId,
      vaultAddress: vaultAddress,
      planName: planName
    });
    await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, 'hivemanager', "pendingPaidOrders", pendingPaidOrders);
  }

  private sortOrdersByMostRecentFirst(orders: HivePlugin.Payment.Order[]): HivePlugin.Payment.Order[] {
    // Most recent orders come first in the list.
    return orders.sort((orderA, orderB)=>{
      if (orderA.getCreationTime() < orderB.getCreationTime())
        return -1;
      else if (orderA.getCreationTime() > orderB.getCreationTime())
        return 1;
      else
        return 0;
    });
  }

  /**
   * Returns the list of orders that are awaiting payment by the hive vault
   * provider.
   */
  public async getOrdersAwaitingPayment(): Promise<HivePlugin.Payment.Order[]> {
    let orders = this.sortOrdersByMostRecentFirst(await this.getActiveVault().getPayment().getAllOrders());
    Logger.log("HiveManager", "All orders:", orders);

    let awaitingOrders = orders.filter((o)=>{
      return o.getState() == "AWAITING_PAYMENT";
    });

    Logger.log("HiveManager", "Orders awaiting payment:", awaitingOrders);

    return awaitingOrders;
  }

  /**
   * Returns the list of orders that are awaiting payment confirmation by the hive vault
   * provider.
   */
  public async getOrdersAwaitingPaymentValidation(): Promise<HivePlugin.Payment.Order[]> {
    let orders = this.sortOrdersByMostRecentFirst(await this.getActiveVault().getPayment().getAllOrders());
    Logger.log("HiveManager", "All orders:", orders);

    let awaitingOrders = orders.filter((o)=>{
      return o.getState() == "AWAITING_TX_CONFIRMATION";
    });

    Logger.log("HiveManager", "Orders awaiting confirmation:", awaitingOrders);

    return awaitingOrders;
  }

  public async getActiveOrders(): Promise<HivePlugin.Payment.Order[]> {
    let orders = this.sortOrdersByMostRecentFirst(await this.getActiveVault().getPayment().getAllOrders());
    Logger.log("HiveManager", "All orders:", orders);

    let activeOrders = orders.filter((o)=>{
      // Active orders are orders COMPLETED, and not expired
      return o.getState() == "COMPLETED" /* TODO - NOT EXPIRED */;
    });

    Logger.log("HiveManager", "Active orders:", activeOrders);

    return activeOrders;
  }

  public getFriendlyOrderState(order: HivePlugin.Payment.Order ) {
    switch (order.getState()) {
        case "AWAITING_PAYMENT":
            return "Waiting for payment";
        case "AWAITING_TX_CONFIRMATION":
            return "Waiting for transaction to be validated";
        case "COMPLETED":
            return "Completed";
        case "FAILED_UNSPECIFIED_REASON":
            return "Failed, unknown reason";
        case "TIMED_OUT_WHILE_WAITING_FOR_PAYMENT":
            return "Timed out waiting for payment";
        case "TIMED_OUT_WHILE_WAITING_FOR_TX_CONFIRMATION":
            return "Timed out waiting for transaction confirmation";
        default:
            return "Unknown state: "+order.getState();
    }
  }
}
