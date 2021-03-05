import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { PopupService } from './popup.service';
import { Subject } from "rxjs";
import { TranslateService } from '@ngx-translate/core';
import { Events } from './events.service';
import { TemporaryAppManagerPlugin } from 'src/app/TMP_STUBS';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { Hive } from 'src/app/elastos-cordova-sdk';
import { ElastosSDKHelper } from 'src/app/helpers/elastossdk.helper';
import { GlobalStorageService } from 'src/app/services/global.storage.service';

declare let hiveManager: HivePlugin.HiveManager;
declare let appManager: AppManagerPlugin.AppManager;

export type VaultLinkStatus = {
  // There is already a vault provider info on chain about a vault provider attacher to this user.
  publishedInfo: {
    vaultName: string,
    vaultAddress: string,
    vaultVersion: string
  };
  // The app locally thinks that we are waiting for a publication during a few minutes. This could be true
  // no matter if there is already a published provider info on chain (updating provider) or not (first time
  // selection of a provider)
  publishingInfo: {
    vaultName: string,
    vaultAddress: string;
  };
}

export type PaidIncompleteOrder = {
    transactionId: string;
    vaultAddress: string;
    planName: string;
}

@Injectable({
  providedIn: 'root'
})
export class HiveService {
  private vaultLinkStatus: VaultLinkStatus = null;
  private client: HivePlugin.Client;
  private activeVault: HivePlugin.Vault = null;
  private activePaymentPlan: HivePlugin.Payment.ActivePricingPlan;
  private pricingInfo: HivePlugin.Payment.PricingInfo = null; // Cached pricing info for user's current vault provider after been fetched.

  private publicationCheckTimer: NodeJS.Timer = null;
  public publicationSubject: Subject<boolean> = new Subject();

  constructor(
    private router: Router,
    private storage: StorageService,
    private globalStorage: GlobalStorageService,
    private popup: PopupService,
    private events: Events,
    public translate: TranslateService,
    private appManager: TemporaryAppManagerPlugin,
    private didSessions: GlobalDIDSessionsService
  ) {}

  async init() {
    let hiveAuthHelper = await new ElastosSDKHelper().newHiveAuthHelper("hivemanager");
    this.client = await hiveAuthHelper.getClientWithAuth((err)=>{
      Logger.error("HiveManager", "Authentication error:", err);
    });

    if (!this.client) {
      Logger.error("HiveManager", "Fatal error in hive manager: Unable to get a hive client instance in init().");
    }
    else {
      Logger.log("HiveManager", "Hive client instance was created");
    }
  }

  /**
   * Check vault phase:
   * - Get address vault DID (did document)
   *    - If no vault address -> full creation =
   *      - Create vault api + register on DID
   *    - If vault address:
   *      - Check if vault is created at this address (get pricing plan?)
   *    - If not created, call createVault()
   */
  async retrieveVaultLinkStatus(): Promise<VaultLinkStatus> {
    Logger.log("HiveManager", "Looking for vault link status");

    let signedInDID = (await this.didSessions.getSignedInIdentity()).didString;

    if (!this.client) {
      // Should not happen, but just in case.
      Logger.error("HiveManager", "Fatal error in hive manager: Hive client not initialized.");
      return null;
    }

    if (this.vaultLinkStatus) {
      Logger.log("HiveManager", "Reusing existing status:", this.vaultLinkStatus);
      return Promise.resolve(this.vaultLinkStatus);
    }

    let status: VaultLinkStatus = {
      publishedInfo: null,
      publishingInfo: null
    };

    // Check if any on going publication.
    let lastPublishedTime = await this.getLastPublishedTime();
    if (lastPublishedTime) {
      if (moment(lastPublishedTime).add(10, "minute") > moment()) {
        // Publication on going
        status.publishingInfo = {
          vaultAddress: "todo-unsaved-yet",
          vaultName: "todo-unsaved-yet"
        }

        // Publication is on going, so we start an internal polling loop to know when this is ready, so that
        // listeners can know when data is really ready on chain.
        this.startAwaitingPublicationResult(signedInDID);
      }
      else {
        // No publication on going
        status.publishingInfo = null;
      }
    }

    // Check if we can find an existing vault provider address on DID chain for this user.
    Logger.log("HiveManager", "Asking hive manager to give us the vault address for current user's DID "+signedInDID);
    try {
      this.activeVault = await this.client.getVault(signedInDID);
    }
    catch (e) {
      if (hiveManager.errorOfType(e, HivePlugin.EnhancedErrorType.VAULT_NOT_FOUND)) {
        // Vault not created on this hive provider yet (old DIDs?) - force user to pick a provider, that will
        // create the vault at the same time.
        Logger.log("HiveManager", "Vault does not exist on this provider. It has to be created again.");
        return null;
      }
      else {
        Logger.error("HiveManager", "Exception while calling getVault() in retrieveVaultLinkStatus():", e);
        throw e;
      }
    }

    if (this.activeVault === null) {
      Logger.log("HiveManager", "No vault for for this DID");
      // Null vault returned, so this either means we are not on ID chain yet,c or we didn't
      // call create vault. So the user will have to do it.
      return status;
    }

    // Ensure the vault was created by claling the createVault() API. We can make sure of this by getting the active
    // payment plan. If none or if a vault not found exception is returned, this means the vault was not yet created.
    try {
      let activePricingPlan = await this.activeVault.getPayment().getActivePricingPlan();
      if (!activePricingPlan) {
        Logger.log("HiveManager", "Call to getActivePricingPlan() returned null. Vault was probably not created correctly earlier and needs to be registered again.");
        return null;
      }
      Logger.log("HiveManager", "Got active payment plan from retrieveVaultLinkStatus():", activePricingPlan);
    }
    catch (e) {
      if (hiveManager.errorOfType(e, HivePlugin.EnhancedErrorType.VAULT_NOT_FOUND)) {
        Logger.log("HiveManager", "Call to getActivePricingPlan() returned a vault not found exception. Vault was probably not created correctly earlier and needs to be registered again.");
        return null;
      }
      else {
        Logger.error("HiveManager", "Exception while calling getActivePricingPlan() in retrieveVaultLinkStatus():", e);
        throw e;
      }
    }

    let currentlyPublishedVaultAddress = this.activeVault.getVaultProviderAddress();
    Logger.log("HiveManager", "Currently published vault address: ", currentlyPublishedVaultAddress);

    if (currentlyPublishedVaultAddress) {
      status.publishedInfo = {
        vaultAddress: currentlyPublishedVaultAddress,
        vaultName: "todo-no-way-to-get-this-yet",
        vaultVersion: await this.activeVault.getNodeVersion()
      };
    }

    Logger.log("HiveManager", "Link status retrieval completed");

    this.vaultLinkStatus = status;

    return status;
  }

  /**
   * Polling that tries to get the publication result for a previously published vault address.
   */
  private startAwaitingPublicationResult(ownerDid: string) {
    let intervalDuration = 30*1000; // 30 seconds
    this.publicationCheckTimer = setInterval(async ()=>{
     /*  let currentlyPublishedVaultAddress = await hiveManager.getVaultAddress(ownerDid);
      if (currentlyPublishedVaultAddress) {
        // Finally we could find the vault address
        this.vaultLinkStatus.publishingInfo = null;
        this.vaultLinkStatus.publishedInfo = {
          vaultAddress: currentlyPublishedVaultAddress,
          vaultName: "todo-unsaved-yet"
        };

        // Let listeners know
        this.publicationSubject.next(true);
      } */
    }, intervalDuration);
  }

  public getActiveVault(): HivePlugin.Vault {
    return this.activeVault;
  }

  private async getLastPublishedTime(): Promise<Date> {
    let lastPublishedTime = await this.storage.get<number>("publicationrequesttime");
    return new Date(lastPublishedTime);
  }

  private async saveLastPublishedTime(): Promise<void> {
    await this.storage.set("publicationrequesttime", Date.now());
  }

  /**
   * Sets and saves a NEW vault provider for the active DID, without any transfer of data.
   */
  public async publishVaultProvider(providerName: string, vaultAddress: string): Promise<boolean> {
    let signedInDID = (await this.didSessions.getSignedInIdentity()).didString;

    // First try to create the vault on the provider
    try {
      let createdVault = await this.client.createVault(signedInDID, vaultAddress);
      if (createdVault) {
        Logger.log("HiveManager", "Vault was newly created on the provider. Now updating vault address on user's DID");

        // Vault creation succeeded, we can now save the provider address on ID chain.
        this.activeVault = createdVault;
      }
      else {
        // Vault already exists on this provider. Nothing to do
        Logger.log("HiveManager", "The vault already exists on the vault provider.");
      }

      let publicationStarted = await this.publishVaultProviderToIDChain(providerName, vaultAddress);
      return publicationStarted;
    }
    catch (err) {
      console.error("Failed to create vault on the vault provider for DID "+signedInDID+" at address "+vaultAddress, err);
      return false;
    }
  }

  private async publishVaultProviderToIDChain(providerName: string, vaultAddress: string): Promise<boolean> {
    return new Promise(async (resolve)=>{
      Logger.log("HiveManager", "Requesting identity app to update the hive provider");

      try {
        let result: {result: {status: string}} = await appManager.sendIntent("https://did.elastos.net/sethiveprovider", {
          name: providerName,
          address: vaultAddress
        });

        Logger.log("HiveManager", "Got sethiveprovider intent result:", result);

        if (result && result.result && result.result.status && result.result.status == "published") {
          // Save local timestamp - We will not allow to pick another provider before a few minutes
          this.saveLastPublishedTime();

          // Vault address was added to user's DID document and publication is on going.
          // Now wait a moment
          resolve(true); // Publishing
        }
        else {
          // Publication was cancelled or errored. Do nothing more. Maybe user will retry.
          Logger.log("HiveManager", "Publication cancelled or errored");
          resolve(false);
        }
      }
      catch(err) {
        Logger.error("HiveManager", "Error while trying to call the sethiveprovider intent: ", err);
          this.popup.ionicAlert(this.translate.instant('alert.error'), this.translate.instant('alert.sorry-provider-not-save') + err, this.translate.instant('alert.ok'));
        resolve(false);
      }
    });
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
      await this.popup.ionicAlert(this.translate.instant('alert.unavailable'), this.translate.instant('alert.only-payments-in-ELA'));
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
      await this.popup.ionicAlert(this.translate.instant('alert.completed'), this.translate.instant('alert.plan-has-been-configured'));
    }
    else {
      await this.popup.ionicAlert(this.translate.instant('alert.operation-not-completed-title'), this.translate.instant('alert.operation-not-completed-text'));
    }
  }

  private async executePayment(cost: number, elaAddress: string): Promise<string> {
    return new Promise(async (resolve, reject)=>{
      try {
        let data: { result: { txid: string }} = await appManager.sendIntent("https://wallet.elastos.net/pay", {
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
      console.error("Incomplete order not found in local storage for transaction ID "+transactionId+"!");
      return;
    }
    else {
      // Remove the pending order from our temporary list.
      pendingPaidOrders.splice(orderIndex, 1);
      Logger.log("HiveManager", "Removing the order from pending paid orders list because it's finalized. New pendingPaidOrders: ", pendingPaidOrders);
      await this.storage.setJson("pendingPaidOrders", pendingPaidOrders);
    }
  }

  /**
   * List of orders that have been actually paid by the user but not sent to the hive node.
   */
  public async getPaidIncompleteOrders(): Promise<PaidIncompleteOrder[]> {
    let pendingPaidOrders = await this.storage.getJson("pendingPaidOrders") as PaidIncompleteOrder[];
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
    await this.storage.setJson("pendingPaidOrders", pendingPaidOrders);
  }

  private sortOrdersByMostRecentFirst(orders: HivePlugin.Payment.Order[]): HivePlugin.Payment.Order[] {
    // Most recent orders come first in the list.
    return orders.sort((orderA, orderB)=>{
      if (orderA.getCreationTime() > orderB.getCreationTime())
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
      return o.getState() == HivePlugin.Payment.OrderState.AWAITING_PAYMENT;
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
      return o.getState() == HivePlugin.Payment.OrderState.AWAITING_TX_CONFIRMATION;
    });

    Logger.log("HiveManager", "Orders awaiting confirmation:", awaitingOrders);

    return awaitingOrders;
  }

  public async getActiveOrders(): Promise<HivePlugin.Payment.Order[]> {
    let orders = this.sortOrdersByMostRecentFirst(await this.getActiveVault().getPayment().getAllOrders());
    Logger.log("HiveManager", "All orders:", orders);

    let activeOrders = orders.filter((o)=>{
      // Active orders are orders COMPLETED, and not expired
      return o.getState() == HivePlugin.Payment.OrderState.COMPLETED /* TODO - NOT EXPIRED */;
    });

    Logger.log("HiveManager", "Active orders:", activeOrders);

    return activeOrders;
  }

  public getFriendlyOrderState(order: HivePlugin.Payment.Order ) {
    switch (order.getState()) {
        case HivePlugin.Payment.OrderState.AWAITING_PAYMENT:
            return "Waiting for payment";
        case HivePlugin.Payment.OrderState.AWAITING_TX_CONFIRMATION:
            return "Waiting for transaction to be validated";
        case HivePlugin.Payment.OrderState.COMPLETED:
            return "Completed";
        case HivePlugin.Payment.OrderState.FAILED_UNSPECIFIED_REASON:
            return "Failed, unknown reason";
        case HivePlugin.Payment.OrderState.TIMED_OUT_WHILE_WAITING_FOR_PAYMENT:
            return "Timed out waiting for payment";
        case HivePlugin.Payment.OrderState.TIMED_OUT_WHILE_WAITING_FOR_TX_CONFIRMATION:
            return "Timed out waiting for transaction confirmation";
        default:
            return "Unknown state: "+order.getState();
    }
  }
}
