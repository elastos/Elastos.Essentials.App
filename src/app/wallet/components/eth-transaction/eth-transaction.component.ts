import { Component, NgZone, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import BigNumber from 'bignumber.js';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Config } from '../../config/Config';
import { ETHTransactionStatus } from '../../model/networks/evms/evm.types';
import { ETHTransactionSpeedup, ETHTransactionStatusInfo, EVMService } from '../../services/evm/evm.service';

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
  public publicationStatus: ETHTransactionStatus;
  // public gasPrice: number = null;
  public gasPrice: string = null;// GWEI
  // public gasLimit: string = null;
  public gasLimit = '200000';
  public nonce = -1;

  constructor(
    public theme: GlobalThemeService,
    private zone: NgZone,
    private modalCtrl: ModalController,
    private evmService: EVMService
  ) { }

  ngOnInit(): void {
  }

  ionViewWillEnter() {
    this.publishing = true;
    this.publicationSuccessful = false;
    this.publicationFailed = false;

    // Listen to publication event
    this.publicationStatusSub = this.evmService.ethTransactionStatus.subscribe((status) => {
      Logger.log('wallet', 'ETHTransactionComponent status:', status)
      this.publicationStatus = status.status;
      switch (this.publicationStatus) {
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
            this.gasPrice = new BigNumber(status.gasPrice).dividedBy(Config.GWEI).toFixed(1);
            this.gasLimit = status.gasLimit;
            this.nonce = status.nonce;
            this.publishing = false;
            this.publicationFailed = true;
          });
          break;
        case ETHTransactionStatus.ERROR:
          this.zone.run(() => {
            this.gasPrice = new BigNumber(status.gasPrice).dividedBy(Config.GWEI).toFixed(1);
            this.gasLimit = status.gasLimit;
            this.nonce = status.nonce;
            this.publishing = false;
            this.publicationFailed = true;
          });
          break;
      }
    });
  }

  speedup() {
    let speedup: ETHTransactionSpeedup = {
      gasPrice: Math.floor(parseFloat(this.gasPrice) * Config.GWEI).toString(),
      gasLimit: this.gasLimit,
      nonce: this.nonce,
    }
    this.evmService.ethTransactionSpeedup.next(speedup);
    this.exitComponent();
  }

  cancel() {
    let status: ETHTransactionStatusInfo = {
      chainId: null,
      gasPrice: null,
      gasLimit: null,
      status: ETHTransactionStatus.CANCEL,
      txId: null,
      nonce: null
    }
    this.evmService.ethTransactionStatus.next(status)
    this.exitComponent();
  }

  exitComponent() {
    if (this.publicationStatusSub) this.publicationStatusSub.unsubscribe();
    void this.modalCtrl.dismiss(null, null, 'evmtransactionloader');
  }
}
