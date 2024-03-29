import { Component, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { NodesService } from '../../services/nodes.service';

@Component({
    selector: 'app-stats',
    templateUrl: './stats.page.html',
    styleUrls: ['./stats.page.scss'],
})
export class StatsPage implements OnInit {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    constructor(public nodesService: NodesService, public translate: TranslateService, public theme: GlobalThemeService) { }

    ngOnInit() {
    }

    async ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('launcher.app-dpos-voting'));
        if (!this.nodesService.statsFetched) {
            await this.nodesService.fetchStats();
        }
    }

    updateStats(event) {
        setTimeout(() => {
            void this.nodesService.fetchStats().then(() => {
                event.target.complete();
            });
        }, 2000);
    }

    //// Define Values ////
    fixHeight(): string {
        return this.nodesService.currentHeight.toLocaleString().split(/\s/).join(',');
    }

    fixTotalVotes(): string {
        const removeDecimals = Number(this.nodesService.totalVotes).toFixed(0);
        return parseInt(removeDecimals).toLocaleString().split(/\s/).join(',');
    }

    fixTotalEla(): string {
        let ela: number = parseFloat(this.nodesService.voters.ELA);
        return ela.toLocaleString().split(/\s/).join(',');
    }

    fixTotalVoters(): string {
        return this.nodesService.voters.total.toLocaleString().split(/\s/).join(',');
    }

    fixActiveAddresses(): string {
        return this.nodesService.mainchain.activeaddresses.toLocaleString().split(/\s/).join(',');
    }

    fixSupply(): string {
        let supply: number = parseFloat(this.nodesService.price.circ_supply);
        return supply.toLocaleString().split(/\s/).join(',');
    }

    fixVolume(): string {
        let volume: number = parseFloat(this.nodesService.price.volume);
        return volume.toLocaleString().split(/\s/).join(',');
    }
}
