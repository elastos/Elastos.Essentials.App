import { Component, Input, NgZone, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { AnySubWallet } from '../../model/networks/base/subwallets/subwallet';
import { MultiSigSafe } from '../../model/safes/multisig.safe';
import { AnyOfflineTransaction } from '../../model/tx-providers/transaction.types';

/**
 * Component used in the transaction details screen for multisig transactions. It can:
 * - Show the cosigners status
 * - Initiate missing signatures
 * - Initiate the final transaction publication when everyone has signed
 */
@Component({
  selector: 'tx-details-multisig',
  templateUrl: './tx-details-multisig.component.html',
  styleUrls: ['./tx-details-multisig.component.scss'],
})
export class TxDetailsMultiSigComponent implements OnInit {
  @Input()
  public subWallet: AnySubWallet;

  @Input()
  public offlineTransaction: AnyOfflineTransaction;

  constructor(
    public theme: GlobalThemeService,
    private zone: NgZone,
    private modalCtrl: ModalController,
  ) { }

  ngOnInit(): void {
  }

  ionViewWillEnter() {

  }

  public async sign() {
    console.log("SIGN", this.subWallet, this.offlineTransaction);

    let multisigSafe = <MultiSigSafe>(this.subWallet.networkWallet.safe as any);
    let signResult = await multisigSafe.signTransactionReal(this.subWallet, this.offlineTransaction.rawTx);
    console.log("signResult", signResult)
  }
}
