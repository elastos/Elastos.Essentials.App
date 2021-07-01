import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteService } from 'src/app/vote/services/vote.service';
import { PopupProvider } from 'src/app/wallet/services/popup.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { App } from 'src/app/model/app.enum';
import { GlobalJsonRPCService } from 'src/app/services/global.jsonrpc.service';
import { Util } from 'src/app/wallet/model/Util';
import { ElastosApiUrlType, GlobalElastosAPIService } from 'src/app/services/global.elastosapi.service';


@Component({
    selector: 'app-manager',
    templateUrl: './manager.page.html',
    styleUrls: ['./manager.page.scss'],
})
export class CRCouncilManagerPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    public masterWalletId: string;
    public state = "";
    public crmemberInfo: any;

    constructor(
        public translate: TranslateService,
        public theme: GlobalThemeService,
        public voteService: VoteService,
        public popupProvider: PopupProvider,
        public jsonRPCService: GlobalJsonRPCService,
        private globalElastosAPIService: GlobalElastosAPIService
    ) {

    }

    ngOnInit() {
        Logger.log("CRCouncilManagerPage", "ngOnInit")
    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('crcouncilmanager.registration-manager'));
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);

        //Get cureent CRs list
        this.crmemberInfo = null;
        const param = {
            method: 'listcurrentcrs',
            params: {
                state: "all"
            },
        };

        let rpcApiUrl = this.globalElastosAPIService.getApiUrl(ElastosApiUrlType.ELA_RPC);
        Logger.log(App.CRCOUNCIL_MANAGER, "rpcApiUrl:", rpcApiUrl);
        const result = await this.jsonRPCService.httpPost(rpcApiUrl, param);
        let did = GlobalDIDSessionsService.signedInDIDString.replace("did:elastos:", "");
        if (!Util.isEmptyObject(result.crmembersinfo)) {
            Logger.log(App.CRCOUNCIL_MANAGER, "crmembersinfo:", result.crmembersinfo);
            for (const crmember of result.crmembersinfo) {
                if (crmember.did == did) {
                    this.state = crmember.state;
                    this.crmemberInfo = crmember;
                    return;
                }
            }
        }

    }

    async registration() {
        await this.voteService.selectWalletAndNavTo(App.CRCOUNCIL_MANAGER, '/crcouncilmanager/registration');
    }

    async crnodeManager() {
        await this.voteService.selectWalletAndNavTo(App.CRCOUNCIL_MANAGER, '/crcouncilmanager/crnode', {
            queryParams: {
                crmember: this.crmemberInfo
            }
        });
    }
}
