import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { Logger } from 'src/app/logger';

export enum OutgoingTransactionState {
  IDLE,
  PUBLISHING,
  PUBLISHED,
  ERRORED
}

export type OutgoingTransactionStatus = {
  state: OutgoingTransactionState;
  message?: string;
}

const idleStatus = (): OutgoingTransactionStatus => {
  return {
    state: OutgoingTransactionState.IDLE
  };
}

/**
 * Follow up of all wallet outgoing transactions, for now mostly to update the UI.
 * Each service that initiates wawllet tx publications is responsible for updating
 * transactions status.
 */
@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  public static instance: TransactionService = null;

  public onGoingPublicationState = new BehaviorSubject<OutgoingTransactionStatus>(idleStatus());

  constructor(
    private modalCtrl: ModalController,
    public translate: TranslateService,
  ) {
    TransactionService.instance = this;
  }

  public resetTransactionPublicationStatus() {
    this.onGoingPublicationState.next(idleStatus());
  }

  /**
   * Shows a standard bottom sheet loader that waits with a spinner until it gets manually
   * closed by this service.
   *
   * This is used to let users wait while publishing transactions.
   *
   * Implementations of publishTransaction() in subwallets decide if they want to use this
   * generic implementation or if they want to use their own sheet, like EVM wallets.
   */
  public async displayGenericPublicationLoader() {
    const modal = await this.modalCtrl.create({
      // eslint-disable-next-line import/no-cycle
      component: (await import('../components/std-transaction/std-transaction.component')).StdTransactionComponent,
      componentProps: {},
      backdropDismiss: false, // Not closeable
      cssClass: "wallet-component-base"
    });

    void modal.onDidDismiss().then((params) => {
      //
    });

    void modal.present();
  }

  public setOnGoingPublishedTransactionState(state: OutgoingTransactionState, message: string = null) {
    Logger.log("wallet", "New outgoing transaction state:", state);
    this.onGoingPublicationState.next({
      state: state,
      message: message
    });
  }
}
