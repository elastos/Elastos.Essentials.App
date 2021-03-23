import { Component, OnInit } from '@angular/core';
import { Native } from '../../../services/native.service';
import { LocalStorage } from '../../../services/storage.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Util } from '../../../model/Util';
import { Events } from '../../../services/events.service';

@Component({
    selector: 'app-contacts',
    templateUrl: './contacts.page.html',
    styleUrls: ['./contacts.page.scss'],
})
export class ContactsPage implements OnInit {
    contactUser = {};
    qrcode: string = null;
    masterId: string = "1";
    isShow: boolean = false;
    params: any = {};
    constructor(public router: Router,
                public native: Native,
                public localStorage: LocalStorage,
                public events: Events) {
        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            this.params = navigation.extras.state || {};
        }
        if (typeof this.params["exatOption"] == "string") {
            this.params["exatOption"] = JSON.parse(this.params["exatOption"]);
            this.isShow = this.params["exatOption"]["hideButton"] || false;
        }
        this.init();
    }

    ngOnInit() {
    }

    init() {
        this.localStorage.get('contactUsers').then((val) => {
            if (val) {
                let id = this.params["id"];
                this.contactUser = JSON.parse(val)[id];
                this.qrcode = this.contactUser["address"].toString();
            }
        });
    }

    pay(address): void {
        this.native.go("/wallet/coin-transfer", { addr: this.contactUser['address'] });
        this.events.publish("address:update", address);
    }
}

