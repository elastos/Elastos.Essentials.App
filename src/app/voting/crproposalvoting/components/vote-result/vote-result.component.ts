import { Component, Input, OnInit } from '@angular/core';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { CRCouncilService } from 'src/app/voting/crcouncilvoting/services/crcouncil.service';
import { VoteResult } from '../../model/proposal-details';

@Component({
    selector: 'vote-result',
    templateUrl: './vote-result.component.html',
    styleUrls: ['./vote-result.component.scss'],
})
export class VoteResultComponent implements OnInit {
    @Input('vote') vote: VoteResult = null;

    constructor(public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
        public crCouncilService: CRCouncilService,
    ) { }

    ngOnInit() { }

    onShowMemberInfo(name: string) {
        if (!name) return;

        let member = this.crCouncilService.crmembers.find( cr => cr.didName === name);
        if (member) {
            this.crCouncilService.selectedMemberDid = member.did;
            void this.globalNav.navigateTo(App.CRPROPOSAL_VOTING, '/crcouncilvoting/crmember');
        }
    }

    getAvatar() {
        if (!this.vote.name) return null;

        let member = this.crCouncilService.crmembers.find( cr => cr.didName === this.vote.name);
        if (member)
            return member.avatar;
        return null;
    }
}
