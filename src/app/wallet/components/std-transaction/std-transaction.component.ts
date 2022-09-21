import { Component, NgZone, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { OutgoingTransactionState, TransactionService } from '../../services/transaction.service';

/**
 * Generic transaction publication component.
 * Doesn't wait for confirmation.
 */
@Component({
  selector: 'app-std-transaction',
  templateUrl: './std-transaction.component.html',
  styleUrls: ['./std-transaction.component.scss'],
})
export class StdTransactionComponent implements OnInit {
  public publishing = false;
  public publicationSuccessful = false;
  public publicationFailed = false;

  private outgoingTxStateSub: Subscription = null;

  constructor(
    public theme: GlobalThemeService,
    private zone: NgZone,
    private modalCtrl: ModalController,
    private transactionService: TransactionService
  ) { }

  ngOnInit(): void {
  }

  ionViewWillEnter() {
    this.publishing = true;
    this.publicationSuccessful = false;
    this.publicationFailed = false;
    this.outgoingTxStateSub = this.transactionService.onGoingPublicationState.subscribe(txState => {
      if (txState.state === OutgoingTransactionState.ERRORED) {
        this.publicationFailed = true;
        this.publishing = false;
      }
      else if (txState.state === OutgoingTransactionState.PUBLISHED) {
        // Show the success animation and exit the component
        this.publishing = false;
        this.publicationSuccessful = true;
        setTimeout(() => {
          this.exitComponent();
        }, 3000);
      }
    });
  }

  ionViewWillLeave() {
    if (this.outgoingTxStateSub) {
      this.outgoingTxStateSub.unsubscribe();
      this.outgoingTxStateSub = null;
    }
  }

  exitComponent() {
    void this.modalCtrl.dismiss();
  }

  cancel() {
    this.exitComponent();
  }
}
