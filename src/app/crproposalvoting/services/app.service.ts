import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { ProposalService } from './proposal.service';
import { ProposalStatus } from '../model/proposal-status';

import * as moment from 'moment';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';

declare let essentialsIntent: EssentialsIntentPlugin.Intent;

@Injectable({
  providedIn: 'root'
})
export class AppService {
  constructor(
    public proposalService: ProposalService,
    private storage: StorageService,
    private notifications: GlobalNotificationsService
  ) { }

  public async getTimeCheckedForProposals() {
    const lastCheckedTime = await this.storage.get('timeCheckedForProposals');
    console.log('Background service: Time-checked for proposals', moment(lastCheckedTime).format('MMMM Do YYYY, h:mm'));

    const today = new Date();
    if(lastCheckedTime) {
        if(!moment(lastCheckedTime).isSame(today, 'd')) {
            this.storage.set('timeCheckedForProposals', today);
            this.checkForNewProposals(today);
        } else {
            console.log('Background service: Proposals already checked today');
        }
    } else {
        this.storage.set('timeCheckedForProposals', today);
        this.checkForNewProposals(today);
    }
  }

  async checkForNewProposals(today: Date) {
    const proposalRes = await this.proposalService.fetchProposals(ProposalStatus.ALL, 1);
    const proposals = proposalRes.data.list;
    console.log('Background service: Proposals fetched', proposals);

    // Send notification if there are any new proposals only for today
    let newProposalsCount: number = 0;
    proposals.forEach((proposal) => {
      if(moment(proposal.createdAt * 1000).isSame(today, 'd')) {
        newProposalsCount++;
      }
    });

    if(newProposalsCount > 0) {
      let message = "";
      if(newProposalsCount === 1) {
        message = "There's a new CRC proposal today, click to check it out";
      } else {
        message = "You have " + newProposalsCount + ' new proposals today, click to check them out';
      }

      const notification = {
        key: 'proposalsToday',
        title: 'CRC Proposals Today',
        message: message,
        url: 'https://launcher.elastos.net/app?id=' + 'org.elastos.trinity.dapp.crproposal'
      };
      this.notifications.sendNotification(notification);
    }

    const lastCheckedProposal = await this.storage.get('lastProposalChecked');
    this.storage.set('lastProposalChecked', proposals[0].id);
    console.log('Background service: Last proposal checked by id', lastCheckedProposal);

    // Send notification new proposals since user last visited elastOS
    if(lastCheckedProposal) {
      const targetProposal = proposals.find(proposal => proposal.id === lastCheckedProposal);
      const targetProposalIndex = proposals.indexOf(targetProposal);

      if(targetProposalIndex > 0) {
        let message = "";
        if(targetProposalIndex === 1) {
          message = "There is a new proposal since you last visited, click to check it out";
        } else {
          message = "You have " + targetProposalIndex + ' new proposals since you last visited, click to check them out';
        }
        const notification = {
          key: 'newProposals',
          title: 'New CRC Proposals',
          message: message,
          url: 'https://launcher.elastos.net/app?id=' + 'org.elastos.trinity.dapp.crproposal'
        };
        this.notifications.sendNotification(notification);
      }
    }
  }
}
