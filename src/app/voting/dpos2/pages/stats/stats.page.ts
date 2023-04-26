import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { DPoS2Service } from '../../services/dpos2.service';

@Component({
    selector: 'app-stats',
    templateUrl: './stats.page.html',
    styleUrls: ['./stats.page.scss'],
})
export class StatsPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    constructor(public dpos2Service: DPoS2Service, public translate: TranslateService, public theme: GlobalThemeService) { }

    ngOnInit() {
    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('launcher.app-dpos2-voting'));
        await this.dpos2Service.fetchStats();
    }

    updateStats(event) {
        setTimeout(() => {
            void this.dpos2Service.fetchStats().then(() => {
                event.target.complete();
            });
        }, 2000);
    }

    //// Define Values ////
    fixHeight(): string {
        return this.dpos2Service.currentHeight.toLocaleString().split(/\s/).join(',');
    }

    fixTotalVotes(): string {
        const removeDecimals = Number(this.dpos2Service.totalVotes).toFixed(0);
        return parseInt(removeDecimals).toLocaleString().split(/\s/).join(',');
    }

    fixTotalEla(): string {
        let ela: number = parseFloat(this.dpos2Service.voters.ELA);
        return ela.toLocaleString().split(/\s/).join(',');
    }

    fixTotalVoters(): string {
        return this.dpos2Service.voters.total.toLocaleString().split(/\s/).join(',');
    }

    fixActiveAddresses(): string {
        return this.dpos2Service.mainchain.activeaddresses.toLocaleString().split(/\s/).join(',');
    }

    fixSupply(): string {
        let supply: number = parseFloat(this.dpos2Service.price.circ_supply);
        return supply.toLocaleString().split(/\s/).join(',');
    }

    fixVolume(): string {
        let volume: number = parseFloat(this.dpos2Service.price.volume);
        return volume.toLocaleString().split(/\s/).join(',');
    }
}
