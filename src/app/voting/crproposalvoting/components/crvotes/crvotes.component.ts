import { Component, Input, OnInit } from '@angular/core';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
    selector: 'crvotes',
    templateUrl: './crvotes.component.html',
    styleUrls: ['./crvotes.component.scss'],
})
export class CrVotesComponent implements OnInit {
    @Input('crvotes') set crvotes(value: any) {
        this.votes = [];
        this.ratio = 0;

        for (let i = 0; i < value.abstain; i++) {
            this.votes.push("abstain");
        }

        for (let i = 0; i < value.approve; i++) {
            this.votes.push("approve");
        }

        for (let i = 0; i < value.reject; i++) {
            this.votes.push("reject");
        }

        let count = value.abstain + value.approve + value.reject;
        this.ratio = Math.floor(count * 100 / 12);
        for (let i = 0; i < 12 - count; i++) {
            this.votes.push("blank");
        }
     }

    public votes = [];
    public ratio = 0;

    constructor(public theme: GlobalThemeService,
        private globalNav: GlobalNavService,
    ) { }

    ngOnInit() {

     }
}
