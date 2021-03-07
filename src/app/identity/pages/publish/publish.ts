import { Component, NgZone, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
    ModalController,
    PopoverController,
    NavController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { UXService } from "../../services/ux.service";
import { DIDService } from "../../services/did.service";
import { DIDSyncService } from "../../services/didsync.service";
import { ProfileService } from "../../services/profile.service";
import { HiveService } from "../../services/hive.service";
import { HttpClient } from "@angular/common/http";
import { Native } from "../../services/native";
import { IntentReceiverService } from "../../services/intentreceiver.service";
import { BasicCredentialsService } from "../../services/basiccredentials.service";
import { Events } from "../../services/events.service";
import { TitleBarComponent } from "src/app/components/titlebar/titlebar.component";
import { GlobalThemeService } from "src/app/services/global.theme.service";

type CredentialDisplayEntry = {
    credential: DIDPlugin.VerifiableCredential;
    issuer: string;
    willingToBePubliclyVisible: boolean;
    isVisible: boolean;
    willingToDelete: boolean;
    canDelete: boolean;
};

@Component({
    selector: "page-publish",
    templateUrl: "publish.html",
    styleUrls: ["publish.scss"],
})

export class PublishPage {
    @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

    constructor(
        public events: Events,
        public route: ActivatedRoute,
        public zone: NgZone,
        private translate: TranslateService,
        private uxService: UXService,
        public theme: GlobalThemeService,
        public hiveService: HiveService,
        public profileService: ProfileService,
        public navCtrl: NavController,
        private basicCredentialService: BasicCredentialsService
    ) {
        this.init();

    }
    avatarImg = "";
    _publishableCredentials: CredentialDisplayEntry[] = [];
    ngOnInit() {
        this.events.subscribe("did:didchanged", () => {
            this.zone.run(() => {
                this.init();
            });
        });



        this._publishableCredentials = [];
        this.profileService.visibleCredentials.forEach(val => this._publishableCredentials.push(Object.assign({}, val)));
        this.profileService.invisibleCredentials.forEach(val => {
            if (val.credential.getSubject().hasOwnProperty("apppackage") || (val.credential.getFragment() == "avatar" && val.credential.getSubject().hasOwnProperty["data"]))
                this._publishableCredentials.push(val);
            //console.log("av " + JSON.stringify(val.credential.getFragment()));

        });
        //console.log("pc " + this._publishableCredentials.length);

        // this.events.subscribe(
        //     "did:publicationstatus",
        //     (status: DIDPublicationStatusEvent) => {
        //         let activeDid = this.didService.getActiveDid();
        //         if (activeDid && activeDid === status.did)
        //             this.profileService.didNeedsToBePublished = status.shouldPublish;
        //     }
        // );

        // this.events.subscribe("diddocument:changed", (publishAvatar: boolean) => {
        //     console.log("Publish avatar?", publishAvatar);
        //     // When the did document content changes, we rebuild our profile entries on screen.
        //     this.init(publishAvatar);
        // });

        // this.events.subscribe("did:credentialadded", () => {
        //     this.zone.run(() => {
        //         this.init();
        //     });
        // });

        // this.events.subscribe("did:promptpublishdid", () => {
        //     this.zone.run(() => {
        //         this.profileService.showWarning("publishIdentity", null);
        //     });
        // });
    }

    init() {

    }

    ionViewWillEnter() {

        this.uxService.setTitleBarBackKeyShown(true);
    }

    ionViewDidEnter() {

    }

    ionViewWillLeave() {
        this.uxService.setTitleBarBackKeyShown(false);
    }

    getDisplayableCredentialTitle(entry: CredentialDisplayEntry): string {
        let fragment = entry.credential.getFragment();
        let translationKey = "credential-info-type-" + fragment;
        let translated = this.translate.instant(translationKey);

        if (!translated || translated == "" || translated == translationKey)
            return fragment;

        return translated;
    }
    displayableProperties(credential: DIDPlugin.VerifiableCredential) {
        let fragment = credential.getFragment();
        if (fragment === "avatar") return [];

        let subject = credential.getSubject();
        return Object.keys(subject)
            .filter((key) => key != "id")
            .sort()
            .map((prop) => {
                return {
                    name: prop,
                    value:
                        subject[prop] != ""
                            ? subject[prop]
                            : this.translate.instant("not-set"),
                };
            });
    }
    publishableCredentials(): CredentialDisplayEntry[] {


        return this._publishableCredentials;
        // return  get filteredCredentials(): CredentialDisplayEntry[] {

        //     if (this.segment == "all") return this.profileService.allCreds;
        //     if (this.segment == "hidden") return this.profileService.invisibleCredentials;
        //     if (this.segment == "visible") return this.profileService.visibleCredentials;

        //     return this.profileService.allCreds.filter((item) => {
        //       let types = item.credential.getTypes();
        //       let isVerified = !types.includes("SelfProclaimedCredential");

        //       if (this.segment == "verified" && isVerified) return true;
        //       if (this.segment == "unverified" && !isVerified) return true;

        //       return false;
        //     });
        //   }
    }


    onVisibilityChange(e, entry: CredentialDisplayEntry) {

        console.log(entry.credential.getId());
        console.log(entry.credential.getFragment());
        this.profileService.setCredentialVisibility(entry.credential.getFragment(), e);
        this.profileService.updateDIDDocument();
    }


    getAvatar(entry: CredentialDisplayEntry): string {
        if (this.avatarImg == "") {
            let subject = entry.credential.getSubject();
            let avatar = subject["avatar"];
            this.avatarImg = `data:${avatar["content-type"]};${avatar["type"]},${avatar["data"]}`;
        }
        return this.avatarImg;
    }

    getCredIconSrc(entry: CredentialDisplayEntry): string {
        let fragment = entry.credential.getFragment();

        if (!this.basicCredentialService.getBasicCredentialkeys().some(x => x == fragment)) {
            fragment = "finger-print";
        }

        let skin = this.theme.darkMode ? "dark" : "light";
        return `/assets/identity/smallIcons/dark/${fragment}.svg`;
    }

    isAvatarCred(entry: CredentialDisplayEntry): boolean {
        let fragment = entry.credential.getFragment();
        if (fragment === "avatar") {
            return true;
        } else {
            return false;
        }
    }
}