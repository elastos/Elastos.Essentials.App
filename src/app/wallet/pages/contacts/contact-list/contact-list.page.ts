import { Component, OnInit } from '@angular/core';
import { WalletManager } from '../../../services/wallet.service';
import { Native } from '../../../services/native.service';
import { Router } from '@angular/router';
import { LocalStorage } from '../../../services/storage.service';
import { Util } from "../../../model/Util";
import { Events } from '../../../services/events.service';

@Component({
    selector: 'app-contact-list',
    templateUrl: './contact-list.page.html',
    styleUrls: ['./contact-list.page.scss'],
})
export class ContactListPage implements OnInit {
    isnodata: boolean = false;
    contactUsers = [];
    params: any = {};
    isHide = true;
    constructor(public router: Router, public walletManager: WalletManager, public native: Native, public localStorage: LocalStorage, public events: Events) {
        this.init();
    }
    ngOnInit() {
    }

    init() {
        const navigation = this.router.getCurrentNavigation();
        this.params = {};
        if (!Util.isEmptyObject(navigation.extras.state)) {
            this.params = navigation.extras.state;
        }
        this.isHide = this.params["hideButton"] || false;
        this.events.subscribe("contanctList:update", () => {
            this.localStorage.get('contactUsers').then((val) => {
                if (val) {
                    if (Util.isEmptyObject(JSON.parse(val))) {
                        this.isnodata = true;
                        return;
                    }
                    this.isnodata = false;
                    this.contactUsers = Util.objtoarr(JSON.parse(val));
                } else {
                    this.isnodata = true;
                }
            });
        });

        this.localStorage.get('contactUsers').then((val) => {
            if (val) {
                if (Util.isEmptyObject(JSON.parse(val))) {
                    this.isnodata = true;
                    return;
                }
                this.isnodata = false;
                this.contactUsers = Util.objtoarr(JSON.parse(val));
            } else {
                this.isnodata = true;
            }
        });
    }

    onAdd(): void {
        this.native.go("/wallet/contacts/list");
    }

    onEdit(item, event) {
        event.stopPropagation();
        this.native.go("/wallet/contacts/create", item);
        return false;
    }

    onClick(item): void {
        if (!this.isHide) {
            this.native.go("/wallet/contacts", { id: item.id, exatOption: JSON.stringify(this.params) });
        }
        else {
            this.events.publish("address:update", item.address);
            this.native.pop();
        }
    }

    ionViewDidLeave() {
        //this.events.unsubscribe("contanctList:update");
    }

}

