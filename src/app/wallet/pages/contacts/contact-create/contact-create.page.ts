import { Component, OnInit } from '@angular/core';
import { Util } from "../../../model/Util";
import { WalletManager } from '../../../services/wallet.service';
import { Native } from '../../../services/native.service';
import { Router } from '@angular/router';
import { LocalStorage } from '../../../services/storage.service';
import { PopupProvider } from '../../../services/popup.service';
import { Events } from '../../../services/events.service';

@Component({
    selector: 'app-contact-create',
    templateUrl: './contact-create.page.html',
    styleUrls: ['./contact-create.page.scss'],
})
export class ContactCreatePage implements OnInit {
    contactUser: any;
    id: String;
    name: String;
    address: String;
    phone: String;
    email: String;
    remark: String;
    isEdit: boolean = false;

    constructor(public router: Router, public walletManager: WalletManager,
            public native: Native,
            public localStorage: LocalStorage,
            public events: Events,
            public popupProvider: PopupProvider) {

        const navigation = this.router.getCurrentNavigation();
        if (!Util.isEmptyObject(navigation.extras.state)) {
            this.contactUser = navigation.extras.state;
            this.id = this.contactUser.id;
            this.name = this.contactUser.name;
            this.address = this.contactUser.address;
            this.phone = this.contactUser.phone;
            this.email = this.contactUser.email;
            this.remark = this.contactUser.remark;
            this.isEdit = true;
        }
        else {
            this.id = Util.uuid();
            // console.log(this.id);
            this.name = "";
            this.address = "";
            this.phone = "";
            this.email = "";
        }
    }

    ngOnInit() {
    }


    add(): void {
        let contactUsers = {
            id: this.id,
            name: this.name,
            address: this.address,
            phone: this.phone,
            email: this.email,
            remark: this.remark
        }
        if (Util.isNull(this.name)) {
            this.native.toast_trans("contact-name-notnull");
            return;
        }
        if (Util.isNull(this.address)) {
            this.native.toast_trans("contact-address-notnull");
            return;
        }
        if (!Util.isAddressValid(this.address)) {
            this.native.toast_trans("contact-address-digits");
            return;
        }
        if (this.phone && Util.checkCellphone(this.phone.toString())) {
            this.native.toast_trans("contact-phone-check");
            return;
        }
        this.localStorage.add('contactUsers', contactUsers).then((val) => {
            this.events.publish("contanctList:update");
            this.native.pop();
        });
    }

    modify() {
        this.add();
    }

    delete(): void {
        this.popupProvider.ionicConfirm("confirmTitle", "text-delete-contact-confirm").then((data) => {
            if (data) {
                this.localStorage.get('contactUsers').then((val) => {
                    let contactUsers = JSON.parse(val);
                    let id = this.id;
                    delete (contactUsers[this.contactUser["id"]]);
                    this.localStorage.set('contactUsers', JSON.stringify(contactUsers));
                    this.events.publish("contanctList:update");
                    this.native.pop();
                });
            }
        });
    }

}
