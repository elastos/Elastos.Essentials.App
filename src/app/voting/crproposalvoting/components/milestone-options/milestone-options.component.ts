import { Component, OnInit } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { CROperationsService } from '../../services/croperations.service';


@Component({
    selector: 'milestone-options',
    templateUrl: './milestone-options.component.html',
    styleUrls: ['./milestone-options.component.scss'],
})
export class MileStoneOptionsComponent implements OnInit {

    command: string;
    withdrawAmout: number;
    lastTracking: any;

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
    }

    public handleCommand(commandName: string) {
        void this.popoverCtrl.dismiss();
        if (commandName == "withdraw") {
            this.crOperations.handleProposalDetailPageCommand(commandName);
        }
        else if (commandName == "updatemilestone") {
            this.crOperations.handleProposalDetailPageCommand(commandName, { stage: this.lastTracking.stage });
        }
        else if (commandName == "reviewmilestone") {
            this.crOperations.handleProposalDetailPageCommand(commandName,
                { stage: this.lastTracking.stage, messageHash: this.lastTracking.apply.messageHash });
        }

    }
}
