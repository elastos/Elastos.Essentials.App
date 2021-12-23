import { Component, OnInit } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { CROperationsService } from '../../services/croperations.service';


@Component({
    selector: 'milestone-options',
    templateUrl: './milestone-options.component.html',
    styleUrls: ['./milestone-options.component.scss'],
})
export class MileStoneOptionsComponent implements OnInit {

    command: string;
    stage: number;
    withdrawAmout: number;

    constructor(
        public theme: GlobalThemeService,
        private popoverCtrl: PopoverController,
        private navParams: NavParams,
        private crOperations: CROperationsService,
    ) { }

    ngOnInit() {
        let lastTracking = this.navParams.get('lastTracking');
        Logger.log("MileStoneOptionsComponent", 'Input:', lastTracking);
        this.command = lastTracking.command;
        this.stage = lastTracking.stage;
        this.withdrawAmout = this.navParams.get('withdrawAmout');;
    }

    public handleCommand(commandName: string) {
        void this.popoverCtrl.dismiss();
        if (commandName == "withdraw") {
            this.crOperations.handleProposalDetailPageCommand(commandName, {amount: this.withdrawAmout});
        }
        else {
            this.crOperations.handleProposalDetailPageCommand(commandName, {stage: this.stage});
        }

    }
}
