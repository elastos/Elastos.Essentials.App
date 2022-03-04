import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { CROperationsService } from '../../services/croperations.service';


@Component({
    selector: 'app-title-options',
    templateUrl: './title-options.component.html',
    styleUrls: ['./title-options.component.scss'],
})
export class TitleOptionsComponent implements OnInit {

    constructor(
        public theme: GlobalThemeService,
        private popoverCtrl: PopoverController,
        private crOperations: CROperationsService,
    ) { }

    ngOnInit() {
    }

    voteforproposal() {
        void this.popoverCtrl.dismiss();
        this.crOperations.handleProposalDetailPageCommand("voteforproposal");
    }
}
