import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { ProposalStatus } from '../model/proposal-status';
import { DIDSessionsStore } from './../../../services/stores/didsessions.store';
import { ProposalService } from './proposal.service';

@Injectable({
  providedIn: 'root'
})
export class AppService {
  constructor(
    public proposalService: ProposalService,
    public translate: TranslateService,
    private storage: GlobalStorageService,
    private notifications: GlobalNotificationsService,
  ) { }

  public async getTimeCheckedForProposals() {
    const lastCheckedTime = await this.storage.getSetting(DIDSessionsStore.signedInDIDString, "crproposal", "timeCheckedForProposals", null);
    Logger.log('crproposal', 'Background service: Time-checked for proposals', moment(lastCheckedTime).format('MMMM Do YYYY, h:mm'));

    const today = new Date();
    if (lastCheckedTime) {
      if (!moment(lastCheckedTime).isSame(today, 'd')) {
        await this.storage.setSetting(DIDSessionsStore.signedInDIDString, "crproposal", "timeCheckedForProposals", today);
        void this.checkForNewProposals(today);
      } else {
        Logger.log('crproposal', 'Background service: Proposals already checked today');
      }
    } else {
      await this.storage.setSetting(DIDSessionsStore.signedInDIDString, "crproposal", "timeCheckedForProposals", today);
      void this.checkForNewProposals(today);
    }
  }

  private async checkForNewProposals(today: Date) {
    // Send notification if there are any new proposals only for today
    let newProposalsCount = 0;
    let proposals = null;
    try {
      proposals = await this.proposalService.fetchProposals(ProposalStatus.ALL, 1);
      Logger.log('crproposal', 'Background service: Proposals fetched', proposals);

      proposals.forEach((proposal) => {
        if (moment(proposal.createdAt * 1000).isSame(today, 'd')) {
          newProposalsCount++;
        }
      });
    }
    catch (err) {
      Logger.error('crproposal', 'checkForNewProposals error:', err)
      return;
    }

    if (newProposalsCount > 0) {
      let message = "";
      if (newProposalsCount === 1) {
        message = this.translate.instant('crproposalvoting.crc-proposals-today-msg');
      } else {
        message = this.translate.instant('crproposalvoting.crc-proposals-today-msg1') + newProposalsCount + this.translate.instant('crproposalvoting.crc-proposals-today-msg2');
      }

      const notification = {
        app: App.CRPROPOSAL_VOTING,
        key: 'proposalsToday',
        title: this.translate.instant('crproposalvoting.crc-proposals-today'),
        message: message,
        url: 'https://launcher.elastos.net/app?id=' + 'org.elastos.trinity.dapp.crproposal'
      };
      void this.notifications.sendNotification(notification);
    }

    const lastCheckedProposal = await this.storage.getSetting(DIDSessionsStore.signedInDIDString, "crproposal", "lastProposalChecked", null);
    await this.storage.setSetting(DIDSessionsStore.signedInDIDString, "crproposal", "lastProposalChecked", proposals[0].id);
    Logger.log('crproposal', 'Background service: Last proposal checked by id', lastCheckedProposal);

    // Send notification new proposals since user last visited Elastos Essentials
    if (lastCheckedProposal) {
      const targetProposal = proposals.find(proposal => proposal.id === lastCheckedProposal);
      const targetProposalIndex = proposals.indexOf(targetProposal);

      if (targetProposalIndex > 0) {
        let message = "";
        if (targetProposalIndex === 1) {
          message = this.translate.instant('crproposalvoting.new-crc-proposals-msg');
        } else {
          message = this.translate.instant('crproposalvoting.new-crc-proposals-msg1') + targetProposalIndex + this.translate.instant('crproposalvoting.new-crc-proposals-msg2');
        }
        const notification = {
          app: App.CRPROPOSAL_VOTING,
          key: 'newProposals',
          title: this.translate.instant('crproposalvoting.new-crc-proposals'),
          message: message,
          url: 'https://launcher.elastos.net/app?id=' + 'org.elastos.trinity.dapp.crproposal'
        };
        void this.notifications.sendNotification(notification);
      }
    }
  }
}
