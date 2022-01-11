import { Component } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { CRCommandType, CROperationsService } from 'src/app/voting/crproposalvoting/services/croperations.service';

@Component({
    selector: 'proposal-titlebar',
    templateUrl: '../../../../components/titlebar/titlebar.component.html',
    styleUrls: ['../../../../components/titlebar/titlebar.component.scss'],
})
export class ProposalTitleBarComponent extends TitleBarComponent {
    constructor(
        public themeService: GlobalThemeService,
        public popoverCtrl: PopoverController,
        public globalNav: GlobalNavService,
        public globalNotifications: GlobalNotificationsService,
        private crOperations: CROperationsService,
    ) {
        super(themeService, popoverCtrl, globalNav, globalNotifications);
    }

    outerLeftIconClicked() {
        if (this.crOperations.onGoingCommand.type == CRCommandType.Scan) {
            Logger.log("ProposalTitleBarComponent", "outerLeftIconClicked sendIntentResponse.");
            void this.crOperations.sendIntentResponse();
        }
        else {
            Logger.log("ProposalTitleBarComponent", "outerLeftIconClicked super.");
            super.outerLeftIconClicked();
        }
    }

    innerLeftIconClicked() {
        if (this.crOperations.onGoingCommand.type == CRCommandType.Scan) {
            Logger.log("ProposalTitleBarComponent", "innerLeftIconClicked sendIntentResponse.")
            void this.crOperations.sendIntentResponse();
        }
        else {
            Logger.log("ProposalTitleBarComponent", "innerLeftIconClicked super.")
            super.innerLeftIconClicked();
        }
    }
}
