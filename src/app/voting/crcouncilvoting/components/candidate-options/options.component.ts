import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalPopupService } from 'src/app/services/global.popup.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { StandardCoinName } from 'src/app/wallet/model/coin';
import { WalletService } from 'src/app/wallet/services/wallet.service';
import { CandidatesService } from '../../services/candidates.service';


@Component({
    selector: 'app-options',
    templateUrl: './options.component.html',
    styleUrls: ['./options.component.scss'],
})
export class CandidateOptionsComponent implements OnInit {

    constructor(
        public theme: GlobalThemeService,
        private popoverCtrl: PopoverController,
        private globalNav: GlobalNavService,
        public candidatesService: CandidatesService,
        public popupProvider: GlobalPopupService,
        private walletManager: WalletService,
        public voteService: VoteService,
    ) { }

    ngOnInit() {
    }

    update() {
        void this.popoverCtrl.dismiss();
        void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/registration');
    }

    async unregister() {
        void this.popoverCtrl.dismiss();
        // void this.globalNav.navigateTo(App.CRCOUNCIL_VOTING, '/crcouncilvoting/unregistration');

        Logger.log(App.CRCOUNCIL_VOTING, 'Calling unregister()');

        if (!await this.popupProvider.ionicConfirm('wallet.text-warning', 'crcouncilvoting.candidate-unregister-warning', 'common.confirm', 'common.cancel')) {
            return;
        }

        try {
            let payloadString = await this.walletManager.spvBridge.generateUnregisterCRPayload(this.voteService.masterWalletId, StandardCoinName.ELA,
                this.candidatesService.candidateInfo.cid);
            if (payloadString) {
                let payload = JSON.parse(payloadString);
                let signature = await this.candidatesService.getSignature(payload.Digest);
                if (signature) {
                    payload.Signature = signature;
                    Logger.log('CandidateRegistrationPage', 'generateUnregisterCRPayload', payload);
                    const rawTx = await this.voteService.sourceSubwallet.createUnregisterCRTransaction(payload, "");
                    await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING);
                }
            }
        }
        catch (e) {

        }
    }
}
