import { Component, NgZone, OnInit } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { ModalController } from '@ionic/angular';
import { ETHTransactionSpeedup, ETHTransactionService, ETHTransactionStatusInfo } from '../../services/ethtransaction.service';
import { ETHTransactionStatus } from '../../model/Transaction';
import BigNumber from 'bignumber.js';

@Component({
  selector: 'app-eth-transaction',
  templateUrl: './eth-transaction.component.html',
  styleUrls: ['./eth-transaction.component.scss'],
})
export class ETHTransactionComponent implements OnInit {
  public publishing = false;
  public publicationSuccessful = false;
  public publicationFailed = false;
  private publicationStatusSub: Subscription;
  // public gasPrice: number = null;
  public gasPrice: string = null;// GWEI
  // public gasLimit: string = null;
  public gasLimit: string = '200000';

  private GWEI = 1000000000;

  constructor(
    public theme: GlobalThemeService,
    private zone: NgZone,
    private modalCtrl: ModalController,
  ) { }

  ngOnInit(): void {
  }

  ionViewWillEnter() {
    this.publishing = true;
    this.publicationSuccessful = false;
    this.publicationFailed = false;

    // Listen to publication event
    this.publicationStatusSub = ETHTransactionService.instance.ethTransactionStatus.subscribe((status)=>{
      Logger.log('wallet', 'ETHTransactionComponent status:', status)
      switch (status.status) {
        case ETHTransactionStatus.PACKED:
          this.zone.run(() => {
            this.publishing = false;
            this.publicationSuccessful = true;
          });
          // Show the successful result and automatically exit this screen.
          setTimeout(() => {
            this.exitComponent();
          }, 3000);
          break;
        case ETHTransactionStatus.UNPACKED:
          this.zone.run(() => {
            this.gasPrice = new BigNumber(status.gasPrice).dividedBy(this.GWEI).toFixed(1);
            this.gasLimit = status.gasLimit;
            this.publishing = false;
            this.publicationFailed = true;
          });
          break;
      }
    });
  }

  speedup() {
    let speedup : ETHTransactionSpeedup = {
      gasPrice: Math.floor(parseFloat(this.gasPrice) * this.GWEI).toString(),
      gasLimit: this.gasLimit,
    }
    ETHTransactionService.instance.ethTransactionSpeedup.next(speedup);
    this.exitComponent();
  }

  cancel() {
    let status: ETHTransactionStatusInfo = {
      chainId: null,
      gasPrice: null,
      gasLimit:  null,
      status: ETHTransactionStatus.CANCEL,
      txId: null
    }
    ETHTransactionService.instance.ethTransactionStatus.next(status)
    this.exitComponent();
  }

  exitComponent() {
    if (this.publicationStatusSub) this.publicationStatusSub.unsubscribe();
    void this.modalCtrl.dismiss();
  }
}
