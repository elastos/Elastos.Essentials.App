import { Component, Input, NgZone, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { StandardMultiSigMasterWallet } from '../../model/masterwallets/standard.multisig.masterwallet';
import { AnySubWallet } from '../../model/networks/base/subwallets/subwallet';
import { MultiSigSafe } from '../../model/safes/multisig.safe';
import { AnyOfflineTransaction } from '../../model/tx-providers/transaction.types';
import { AuthService } from '../../services/auth.service';
import { MultiSigService } from '../../services/multisig.service';
import { OfflineTransactionsService } from '../../services/offlinetransactions.service';

type CosignerWithStatus = {
  name: string;
  xpub: string;
  signed: boolean;
}

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

  public cosignersWithStatus: CosignerWithStatus[] = [];

  // UI logic
  public fetchingTxInfo = true;
  public uploadingSignature = false;

  constructor(
    public theme: GlobalThemeService,
    private zone: NgZone,
    private modalCtrl: ModalController,
    private offlineTransactionsService: OfflineTransactionsService,
    private authService: AuthService,
    private multiSigService: MultiSigService
  ) { }

  async ngOnInit() {
    console.log("TxDetailsMultiSigComponent ionViewWillEnter", this.offlineTransaction)
    // Get the most recent tx info stored in the service, and update our local offline transaction
    this.fetchingTxInfo = true;
    let txInfo = await this.multiSigService.fetchPendingTransaction(this.offlineTransaction.transactionKey);

    console.log("TxDetailsMultiSigComponent got txinfo", txInfo)

    // Update our local model
    if (txInfo && txInfo.rawTransaction) {
      this.offlineTransaction.rawTx = txInfo.rawTransaction;
      await this.offlineTransactionsService.storeTransaction(this.subWallet, this.offlineTransaction);
    }

    await this.prepareCosigners();

    this.fetchingTxInfo = false;
  }

  public async sign() {
    // Force password prompt
    let payPassword = await this.authService.getWalletPassword(this.subWallet.masterWallet.id, true, true);
    if (!payPassword) {
      return; // Can't continue without the wallet password
    }

    console.log("SIGN", this.subWallet, this.offlineTransaction);

    let multisigSafe = <MultiSigSafe>(this.subWallet.networkWallet.safe as any);
    let signResult = await multisigSafe.signTransactionReal(this.subWallet, this.offlineTransaction.rawTx);
    if (signResult.signedTransaction) {
      console.log("signResult", signResult);

      // Update local model with our signature
      this.offlineTransaction.rawTx = JSON.parse(signResult.signedTransaction);
      await this.offlineTransactionsService.storeTransaction(this.subWallet, this.offlineTransaction);

      // Upload the signed tx to essentials multisig API.
      await this.multiSigService.uploadSignedTransaction(this.offlineTransaction.transactionKey, this.offlineTransaction.rawTx)

      if (await multisigSafe.hasEnoughSignaturesToPublish(this.offlineTransaction.rawTx)) {
        // If last to sign: publish
        await this.subWallet.sendSignedTransaction(signResult.signedTransaction, null, false);
      }
    }
  }

  private getMultiSigMasteWallet(): StandardMultiSigMasterWallet {
    return <StandardMultiSigMasterWallet>this.subWallet.masterWallet;
  }

  private async prepareCosigners() {
    let masterWallet = this.getMultiSigMasteWallet();
    let cosigners: CosignerWithStatus[] = [];

    for (let signer of masterWallet.signersExtPubKeys) {
      cosigners.push({
        name: this.getShortXPub(signer),
        xpub: signer,
        signed: await (<MultiSigSafe><any>this.subWallet.networkWallet.safe).hasCosignerSigned(signer, this.offlineTransaction.rawTx)
      });
    }

    this.cosignersWithStatus = cosigners;
  }

  private getShortXPub(xpub: string): string {
    return xpub.substring(0, 10) + " ... " + xpub.substring(xpub.length - 6);
  }

  public getCosignerSignatureStatus(cosigner: CosignerWithStatus): string {
    return cosigner.signed ? "Signed" : "Not signed";
  }
}
