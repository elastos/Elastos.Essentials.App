import { Component, OnInit, ViewChild } from '@angular/core';
import type { CRInfoJson } from '@elastosfoundation/wallet-js-sdk';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { areaList } from 'src/app/model/area.list';
import { Util } from 'src/app/model/util';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { VoteService } from 'src/app/voting/services/vote.service';
import { CRCouncilService } from '../../services/crcouncil.service';


enum InfoOperation {
    Registration = "registration",
    UpdateCandidate = "updateCandidate",
    UpdateMember = "updateMember",
}

@Component({
    selector: 'app-register-update',
    templateUrl: './register-update.page.html',
    styleUrls: ['./register-update.page.scss'],
})
export class RegisterUpdatePage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    // public masterWalletId: string;
    public info: any = {
        nickname: "",
        location: 0,
        url: '',
        state: "Unregistered",
    };
    public originInfo: any = null;
    public needConfirm = false;

    public infoOpration = InfoOperation.Registration;

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        public voteService: VoteService,
        public jsonRPCService: GlobalJsonRPCService,
        private globalNative: GlobalNativeService,
        public crCouncilService: CRCouncilService,
    ) {

    }

    ngOnInit() {
        Logger.log("RegisterUpdatePage", "ngOnInit")
    }

    ionViewWillEnter() {
        Logger.log("RegisterUpdatePage", this.voteService.masterWalletId);

        this.originInfo = Util.clone(this.crCouncilService.updateInfo);
        if (!this.crCouncilService.updateInfo) {
            this.infoOpration = InfoOperation.Registration;
            this.titleBar.setTitle(this.translate.instant('crcouncilvoting.register-candidate'));
        }
        else if (this.crCouncilService.updateInfo.isSelf) {
            this.infoOpration = InfoOperation.UpdateMember;
            this.titleBar.setTitle(this.translate.instant('crcouncilvoting.update-member'));
        }
        else if (this.crCouncilService.updateInfo.state != 'Unregistered') {
            this.infoOpration = InfoOperation.UpdateCandidate;
            this.titleBar.setTitle(this.translate.instant('crcouncilvoting.update-candidate'));
        }

        if (this.infoOpration != InfoOperation.Registration) {
            this.originInfo = Util.clone(this.crCouncilService.updateInfo);
            if (this.info.state == "Unregistered") {
                this.info = Util.clone(this.originInfo);
            }
            this.info.nickname = this.info.nickname || this.info.didName;
            this.info.url = this.info.url || this.info.address;
        }
        else if (this.crCouncilService.isCRMember) {
            this.info.nickname = this.crCouncilService.crmemberInfo.nickname;
            this.info.url = this.crCouncilService.crmemberInfo.url;
            this.info.location = this.crCouncilService.crmemberInfo.location;
        }
    }

    public getAreaList() {
        // Filter out United States, as supernodes are not allowed to register in that country.
        return areaList.filter(a => a != 1001);
    }

    checkValues() {
        Logger.log("RegisterUpdatePage", "Candidate Info", this.info);

        var blankMsg = this.translate.instant('common.text-input-is-blank');
        var formatWrong = this.translate.instant('common.text-input-format-wrong');
        if (!this.info.nickname || this.info.nickname == "") {
            blankMsg = this.translate.instant('crcouncilvoting.name') + blankMsg;
            this.globalNative.genericToast(blankMsg);
            return;
        }

        if (!this.info.url || this.info.url == "") {
            blankMsg = this.translate.instant('crcouncilvoting.url') + blankMsg;
            this.globalNative.genericToast(blankMsg);
            return;
        }

        if (!this.info.url.match("((http|https)://)(([a-zA-Z0-9._-]+.[a-zA-Z]{2,6})|([0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}))(:[0-9]{1,4})*(/[a-zA-Z0-9&%_./-~-]*)?")) {
            formatWrong = this.translate.instant('crcouncilvoting.url') + formatWrong;
            this.globalNative.genericToast(formatWrong);
            return;
        }

        if (!this.info.location || this.getAreaList().indexOf(this.info.location) == -1) {
            blankMsg = this.translate.instant('crcouncilvoting.location') + blankMsg;
            this.globalNative.genericToast(blankMsg);
            return;
        }

        if (this.originInfo == null) { // Create
            // Check the nickname whether used
            for (let candidate of this.crCouncilService.originCandidates) {
                if (candidate.nickname == this.info.nickname) {
                    this.globalNative.genericToast('crcouncilvoting.text-candidate-name-already-used');
                    return;
                }
            }
        }
        else { // Update
            // Check don't modify
            if (this.info.location == this.originInfo.location
                && this.info.url == this.originInfo.url) {
                this.globalNative.genericToast('crcouncilvoting.text-candidate-info-dont-modify');
                return;
            }
        }

        this.needConfirm = true;
    }

    async confirm() {
        if (this.infoOpration == InfoOperation.Registration) {
            await this.register();
        }
        else {
            await this.update();
        }
    }

    async getCRInfoPayload(): Promise<CRInfoJson> {
        if (!this.info.ownerpublickey) {
            this.info.ownerpublickey = await Util.getSelfPublicKey();
        }

        if (!this.info.did) {
            this.info.did = Util.getShortDidString();
        }

        Logger.log('RegisterUpdatePage', 'Info', this.info);
        const payload: any = this.voteService.sourceSubwallet.generateCRInfoPayload(
            this.info.ownerpublickey, this.info.did, this.info.nickname, this.info.url, this.info.location);

        if (payload) {
            let signature = await this.crCouncilService.getSignature(payload.Digest);
            if (signature) {
                payload.Signature = signature;
                Logger.log('RegisterUpdatePage', 'generateCRInfoPayload', payload);
                return payload;
            }
        }

        return null;
    }

    async register() {
        try {
            let payload = await this.getCRInfoPayload();
            if (payload) {
                await this.globalNative.showLoading(this.translate.instant('common.please-wait'));
                const rawTx = await this.voteService.sourceSubwallet.createRegisterCRTransaction(payload, this.voteService.deposit5K, "");
                await this.globalNative.hideLoading();
                let ret = await this.voteService.signAndSendRawTransaction(rawTx, App.CRCOUNCIL_VOTING, '/crcouncilvoting/candidates');
                if (ret) {
                    this.voteService.toastSuccessfully('crcouncilvoting.register-candidate');
                }
            }
        }
        catch (e) {
            await this.globalNative.hideLoading();
            await this.voteService.popupErrorMessage(e);
        }
    }

    async update() {
        Logger.log('RegisterUpdatePage', 'Calling update()', this.info);
        try {
            let payload = await this.getCRInfoPayload();
            if (payload) {
                await this.globalNative.showLoading(this.translate.instant('common.please-wait'));
                const rawTx = await this.voteService.sourceSubwallet.createUpdateCRTransaction(payload, "");
                await this.globalNative.hideLoading();
                let ret = await this.voteService.signAndSendRawTransaction(rawTx);
                if (ret) {
                    if (this.infoOpration == InfoOperation.UpdateCandidate) {
                        this.voteService.toastSuccessfully('crcouncilvoting.update-candidate');
                    }
                    else {
                        this.voteService.toastSuccessfully('crcouncilvoting.update-member');
                    }
                }
            }
        }
        catch (e) {
            await this.globalNative.hideLoading();
            await this.voteService.popupErrorMessage(e);
        }
    }
}
