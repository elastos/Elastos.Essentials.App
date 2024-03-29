import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Order, PricingPlan, Vault, VaultInfo } from '@elastosfoundation/hive-js-sdk';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from "rxjs";
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalHiveService } from 'src/app/services/global.hive.service';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import { DIDSessionsStore } from './../../services/stores/didsessions.store';

export type PaidIncompleteOrder = {
  orderId: number;
  transactionId: string;
  vaultAddress: string;
  planName: string;
}

@Injectable({
  providedIn: 'root'
})
export class HiveService {
  private pricingPlans: PricingPlan[] = []; // Cached available pricing plans for user's current vault provider after been fetched.

  private publicationCheckTimer: NodeJS.Timer = null;
  public publicationSubject: Subject<boolean> = new Subject();

  constructor(
    private router: Router,
    private storage: GlobalStorageService,
    private globalPopupService: GlobalPopupService,
    private events: GlobalEvents,
    public translate: TranslateService,
    private globalIntentService: GlobalIntentService,
    private globalHiveService: GlobalHiveService,
    private didSessions: GlobalDIDSessionsService
  ) { }

  async init() {
  }

  stop() {
  }

  public getActiveVault(): Vault {
    return this.globalHiveService.getActiveVaultServices();
  }

  private async getLastPublishedTime(): Promise<Date> {
    let lastPublishedTime = await this.storage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'hivemanager', "publicationrequesttime", 0);
    return new Date(lastPublishedTime);
  }

  private async saveLastPublishedTime(): Promise<void> {
    await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'hivemanager', "publicationrequesttime", Date.now());
  }

  public async getPricingPlans(): Promise<PricingPlan[]> {
    if (this.pricingPlans)
      return this.pricingPlans;

    let subscriptionService = await this.globalHiveService.getActiveUserSubscriptionServices();
    let plans = await subscriptionService.getPricingPlanList();

    this.pricingPlans = plans;

    return this.pricingPlans;
  }

  public async getActivePricingPlan(): Promise<VaultInfo> {
    let subscriptionService = await this.globalHiveService.getActiveUserSubscriptionServices();
    return await subscriptionService.checkSubscription();
  }

  /**
   *
   */
  public async purchasePlan(plan: PricingPlan): Promise<void> {
    if (plan.getCurrency() != "ELA") {
      await this.globalPopupService.ionicAlert('hivemanager.alert.unavailable', 'hivemanager.alert.only-payments-in-ELA', 'common.understood');
      return;
    }

    let operationSuccessful: boolean;
    if (plan.getAmount() == 0) {
      // TODO: save that user doesn't want to renew his paid subscription.
      operationSuccessful = true;
    }
    else {
      try {
        let subscriptionService = await this.globalHiveService.getActiveUserSubscriptionServices();

        // Create a payment order
        let order = await subscriptionService.placeOrder(plan.getName());

        // Pay using a wallet.
        let transactionID = await this.executePayment(order);

        // TODO: save txid and (maybe? or create a new order to retry?) orderid to local storage until we are sure payOrder() was successful, to make sure we don't
        // loose any payment, then retry until it's successful.

        if (transactionID) {
          // Save the payment information locally.
          await this.savePaidIncompleteOrder(order, transactionID, await this.getActiveVault().getServiceContext().getProviderAddress());

          await this.notifyProviderOfPaidOrder(order, transactionID);

          Logger.log("HiveManager", "Plan purchase completed successfully");

          operationSuccessful = true;
        }
        else {
          Logger.warn("HiveManager", "Payment failure");
          operationSuccessful = false;
        }
      }
      catch (e) {
        operationSuccessful = false;
      }
    }

    if (operationSuccessful) {
      await this.globalPopupService.ionicAlert('hivemanager.alert.completed', 'hivemanager.alert.plan-has-been-configured', 'hivemanager.alert.ok');
    }
    else {
      await this.globalPopupService.ionicAlert('hivemanager.alert.operation-not-completed-title', 'hivemanager.alert.operation-not-completed-text', 'hivemanager.alert.ok');
    }
  }

  private executePayment(order: Order): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        let data: { result: { txid: string } } = await this.globalIntentService.sendIntent("https://wallet.web3essentials.io/pay", {
          amount: order.getPaymentAmount(),
          receiver: order.getReceivingAddress(),
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
  private async notifyProviderOfPaidOrder(order: Order, transactionID: string) {
    let subscriptionService = await this.globalHiveService.getActiveUserSubscriptionServices();

    // Let the vault provider know which transaction IDs have been generated for the payment of this order.
    Logger.log("HiveManager", "Paying order on vault for transaction ID", transactionID);
    await subscriptionService.settleOrder(order.getOrderId());

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

    let subscriptionService = await this.globalHiveService.getActiveUserSubscriptionServices();

    let incompleteOrders = await this.getPaidIncompleteOrders();
    if (incompleteOrders.length == 0) {
      // No incomplete order, nothing to finalize.
      Logger.log("HiveManager", "No incomplete order, nothing to do.");
      return;
    }
    else {
      // For each incomplete order, try to call payOrder() again.
      for (let incompleteOrder of incompleteOrders) {
        try {
          let order = await subscriptionService.getOrder(incompleteOrder.orderId);

          Logger.log("HiveManager", "Retrying to finalize paid incomplete order:", incompleteOrder);
          await this.notifyProviderOfPaidOrder(order, incompleteOrder.transactionId);
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
    let orderIndex = pendingPaidOrders.findIndex((order) => {
      return order.transactionId == transactionId;
    });

    if (orderIndex == -1) {
      Logger.error('HiveManager', "Incomplete order not found in local storage for transaction ID " + transactionId + "!");
      return;
    }
    else {
      // Remove the pending order from our temporary list.
      pendingPaidOrders.splice(orderIndex, 1);
      Logger.log("HiveManager", "Removing the order from pending paid orders list because it's finalized. New pendingPaidOrders: ", pendingPaidOrders);
      await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'hivemanager', "pendingPaidOrders", pendingPaidOrders);
    }
  }

  /**
   * List of orders that have been actually paid by the user but not sent to the hive node.
   */
  public async getPaidIncompleteOrders(): Promise<PaidIncompleteOrder[]> {
    let pendingPaidOrders = await this.storage.getSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'hivemanager', "pendingPaidOrders", []) as PaidIncompleteOrder[];
    if (!pendingPaidOrders) {
      return [];
    }
    else {
      return pendingPaidOrders;
    }
  }

  public async getPaidIncompleteOrderByOrderId(orderId: number): Promise<PaidIncompleteOrder> {
    let pendingPaidOrders = await this.getPaidIncompleteOrders();
    return pendingPaidOrders.find(o => o.orderId === orderId) || null;
  }

  private async savePaidIncompleteOrder(order: Order, transactionId: string, vaultAddress: string) {
    let pendingPaidOrders = await this.getPaidIncompleteOrders();
    pendingPaidOrders.push({
      orderId: order.getOrderId(),
      transactionId: transactionId,
      vaultAddress: vaultAddress,
      planName: order.getPricingPlan()
    });
    await this.storage.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, 'hivemanager', "pendingPaidOrders", pendingPaidOrders);
  }

  private sortOrdersByMostRecentFirst(orders: Order[]): Order[] {
    // Most recent orders come first in the list.
    return orders.sort((orderA, orderB) => {
      if (orderA.getCreateTime() < orderB.getCreateTime())
        return -1;
      else if (orderA.getCreateTime() > orderB.getCreateTime())
        return 1;
      else
        return 0;
    });
  }

  /**
   * Returns the list of orders that are awaiting payment by the hive vault
   * provider.
   */
  public async getOrdersAwaitingPayment(): Promise<Order[]> {
    let subscriptionService = await this.globalHiveService.getActiveUserSubscriptionServices();

    let orders = this.sortOrdersByMostRecentFirst(await subscriptionService.getOrders());
    Logger.log("HiveManager", "All orders:", orders);

    let awaitingOrders = orders.filter((o) => {
      // Orders that are in hive SDK but not in our incomplete orders list
      let paidIncompleteOrder = this.getPaidIncompleteOrderByOrderId(o.getOrderId());
      return !o.getProof() && paidIncompleteOrder == null;
    });

    Logger.log("HiveManager", "Orders awaiting payment:", awaitingOrders);

    return awaitingOrders;
  }

  /**
   * Returns the list of orders that are awaiting payment confirmation by the hive vault
   * provider.
   */
  public async getOrdersAwaitingPaymentValidation(): Promise<Order[]> {
    let subscriptionService = await this.globalHiveService.getActiveUserSubscriptionServices();

    let orders = this.sortOrdersByMostRecentFirst(await subscriptionService.getOrders());
    Logger.log("HiveManager", "All orders:", orders);

    let awaitingOrders = orders.filter((o) => {
      // Orders that are in hive SDK AND in our incomplete orders list, but with no proof received by the hive node yet
      let paidIncompleteOrder = this.getPaidIncompleteOrderByOrderId(o.getOrderId());
      return !o.getProof() && paidIncompleteOrder != null;
    });

    Logger.log("HiveManager", "Orders awaiting confirmation:", awaitingOrders);

    return awaitingOrders;
  }

  public async getActiveOrders(): Promise<Order[]> {
    let subscriptionService = await this.globalHiveService.getActiveUserSubscriptionServices();

    let orders = this.sortOrdersByMostRecentFirst(await subscriptionService.getOrders());
    Logger.log("HiveManager", "All orders:", orders);

    let activeOrders = orders.filter((o) => {
      // Active orders are orders with proof
      return o.getProof();
    });

    Logger.log("HiveManager", "Active orders:", activeOrders);

    return activeOrders;
  }

  public async getFriendlyOrderState(order: Order): Promise<string> {
    let subscriptionService = await this.globalHiveService.getActiveUserSubscriptionServices();

    let orders = this.sortOrdersByMostRecentFirst(await subscriptionService.getOrders());

    return "To do"; // TMP

    /* TODO switch (order.getState()) {
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
        return "Unknown state: " + order.getState();
    }*/
  }
}
