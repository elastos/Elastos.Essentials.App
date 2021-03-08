import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { CROperationsService } from './croperations.service';
import * as moment from 'moment';
import { ProposalStatus } from '../model/proposal-status';

declare let appManager: AppManagerPlugin.AppManager;
declare let didManager: DIDPlugin.DIDManager;

type CRWebsiteCommand = {
    command: string; // Ex: "voteforproposal"
}

type VoteForProposalCommand = CRWebsiteCommand & {
    data: {
        proposalHash: string;
    }
}

@Injectable({
    providedIn: 'root'
})
export class UXService {
    public static instance: UXService = null;
    private isReceiveIntentReady = false;
    private appIsLaunchingFromIntent = false; // Is the app starting because of an intent request?

    constructor(
        private router: Router,
        private navCtrl: NavController,
        private toastCtrl: ToastController
    ) {}

    async init() {
        console.log("UXService is initializing");

        /* TODO @chad titleBarManager.addOnItemClickedListener((menuIcon)=>{
            if (menuIcon.key == "back") {
                this.titlebarBackButtonHandle();
            }
        });

        this.setTitleBarScanIconVisible(true);*/
    }

    setTitleBarBackKeyShown(show: boolean) {
        /* TODO @chad if (show) {
            titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, {
                key: "back",
                iconPath: TitleBarPlugin.BuiltInIcon.BACK
            });
        }
        else {
            titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, null);
        }*/
    }

    setTitleBarCloseMode(useCloseIcon: boolean) {
        /* TODO @chad if (useCloseIcon)
            titleBarManager.setNavigationMode(TitleBarPlugin.TitleBarNavigationMode.CLOSE);
        else
            titleBarManager.setNavigationMode(TitleBarPlugin.TitleBarNavigationMode.HOME);*/
    }

    setTitleBarScanIconVisible(visible: boolean) {
        /* TODO @chad if (visible) {
            titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_RIGHT, {
                key: "scan",
                iconPath: TitleBarPlugin.BuiltInIcon.SCAN
            });
        }
        else {
            titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_RIGHT, null);
        }*/
    }

    async titlebarBackButtonHandle() {
        this.navCtrl.back();
    }

    /**
     * Close this application.
     */
    close() {
        console.log("Closing app");
        this.navCtrl.back();
    }

    formatDate(timestamp) {
        return moment(timestamp * 1000).format('MMMM Do YYYY');
    }

    getDisplayableStatus(status: ProposalStatus) {
        switch (status) {
          case 'VOTING':
              return 'Under Council Review';
          case 'NOTIFICATION':
              return 'Under Community Review';
          case 'ACTIVE':
              return 'Active';
          case 'FINAL':
              return 'Approved';
          case 'REJECTED':
              return 'Rejected';
        }
    }

    async genericToast(msg: string) {
        const toast = await this.toastCtrl.create({
            mode: 'ios',
            color: 'primary',
            header: msg,
            duration: 2000
        });
        toast.present();
    }
}
