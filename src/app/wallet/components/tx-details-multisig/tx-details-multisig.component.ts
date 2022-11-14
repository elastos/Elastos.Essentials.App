import { Component, Input, NgZone, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { StandardMultiSigMasterWallet } from '../../model/masterwallets/standard.multisig.masterwallet';
import { AnySubWallet } from '../../model/networks/base/subwallets/subwallet';
import { MultiSigSafe } from '../../model/safes/multisig.safe';
import { AnyOfflineTransaction } from '../../model/tx-providers/transaction.types';
import { AuthService } from '../../services/auth.service';
import { MultiSigService } from '../../services/multisig.service';
import { Native } from '../../services/native.service';
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
  public isSelfSigned = false;
  public isSelfSigning = false;
  public canPublish = false; // Enough cosigners have signed, the transaction can be published
  public isPublishing = false;

  constructor(
    public theme: GlobalThemeService,
    private zone: NgZone,
    private native: Native,
    private modalCtrl: ModalController,
    private offlineTransactionsService: OfflineTransactionsService,
    private authService: AuthService,
    private translate: TranslateService,
    private nav: GlobalNavService,
    private multiSigService: MultiSigService
  ) { }

  async ngOnInit() {
    // Get the most recent tx info stored in the service, and update our local offline transaction
    this.fetchingTxInfo = true;
    let txInfo = await this.multiSigService.fetchPendingTransaction(this.offlineTransaction.transactionKey);

    // Update our local model
    if (txInfo && txInfo.rawTransaction) {
      this.offlineTransaction.rawTx = txInfo.rawTransaction;
      await this.offlineTransactionsService.storeTransaction(this.subWallet, this.offlineTransaction);
    }

    await this.updateIsSelfSigned();
    await this.prepareCosigners();
    await this.updateCanPublishState();

    this.fetchingTxInfo = false;
  }

  public async sign() {
    if (this.isSelfSigning)
      return;

    this.isSelfSigning = true;

    // Force password prompt
    let payPassword = await this.authService.getWalletPassword(this.subWallet.masterWallet.id, true, true);
    if (!payPassword) {
      this.isSelfSigning = false;
      return; // Can't continue without the wallet password
    }

    //console.log("SIGN", this.subWallet, this.offlineTransaction);

    let multisigSafe = <MultiSigSafe>(this.subWallet.networkWallet.safe as any);
    let signResult = await multisigSafe.signTransactionReal(this.subWallet, this.offlineTransaction.rawTx);
    if (signResult.signedTransaction) {
      //console.log("signResult", signResult);

      // Upload the signed tx to essentials multisig API.
      let uploaded  = await this.multiSigService.uploadSignedTransaction(this.offlineTransaction.transactionKey, this.offlineTransaction.rawTx);
      if (uploaded) {
          // Update local model with our signature
          this.offlineTransaction.rawTx = JSON.parse(signResult.signedTransaction);
          await this.offlineTransactionsService.storeTransaction(this.subWallet, this.offlineTransaction);

          await this.updateIsSelfSigned();

          await this.updateCanPublishState();
      } else {
        void this.native.toast_trans('common.network-or-server-error');
      }
    }

    this.isSelfSigning = false;
  }

  private getMultiSigMasterWallet(): StandardMultiSigMasterWallet {
    return <StandardMultiSigMasterWallet>this.subWallet.masterWallet;
  }

  private getSafe(): MultiSigSafe {
    return (<MultiSigSafe><any>this.subWallet.networkWallet.safe);
  }

  private async prepareCosigners() {
    let masterWallet = this.getMultiSigMasterWallet();
    let cosigners: CosignerWithStatus[] = [];

    for (let signer of masterWallet.signersExtPubKeys) {
      cosigners.push({
        name: this.getShortXPub(signer),
        xpub: signer,
        signed: await this.getSafe().hasCosignerSigned(signer, this.offlineTransaction.rawTx)
      });
    }

    this.cosignersWithStatus = cosigners;
  }

  private async updateCanPublishState() {
    let multisigSafe = <MultiSigSafe>(this.subWallet.networkWallet.safe as any);
    if (await multisigSafe.hasEnoughSignaturesToPublish(this.offlineTransaction.rawTx))
      this.canPublish = true;
  }

  private async updateIsSelfSigned(): Promise<void> {
    this.isSelfSigned = await this.getSafe().hasSigningWalletSigned(this.offlineTransaction.rawTx);
  }

  private getShortXPub(xpub: string): string {
    return xpub.substring(0, 10) + " ... " + xpub.substring(xpub.length - 6);
  }

  public getCosignerSignatureStatus(cosigner: CosignerWithStatus): string {
    return cosigner.signed ? this.translate.instant('wallet.multi-signature-signed') : this.translate.instant('wallet.multi-signature-not-signed');
  }

  public copyTransactionLinkToClipboard() {
    let transactionLink = `https://wallet.web3essentials.io/multisigtx?t=${this.offlineTransaction.transactionKey}`;
    void this.native.copyClipboard(transactionLink);
    void this.native.toast_trans('wallet.multi-signature-transaction-link-copied');
  }

  public async publish() {
    let multisigSafe = <MultiSigSafe>(this.subWallet.networkWallet.safe as any);
    if (!(await multisigSafe.hasEnoughSignaturesToPublish(this.offlineTransaction.rawTx)))
      return;

    this.isPublishing = true;
    let result = await this.subWallet.sendSignedTransaction(JSON.stringify(this.offlineTransaction.rawTx), null, false);
    this.isPublishing = false;

    if (result.published) {
      // Publish ok, so we delete the offline transaction and the temporary multisig transaction (remote api)
      // then we go back to the previous screen.
      await OfflineTransactionsService.instance.removeTransaction(this.subWallet, this.offlineTransaction);
      await MultiSigService.instance.deletePendingTransaction(this.offlineTransaction.transactionKey);
      void this.nav.navigateBack();
    }
  }
}
