import { ChangeDetectorRef, Component, EventEmitter, Input, NgZone, Output, ViewChild } from '@angular/core';
import { Keyboard } from '@awesome-cordova-plugins/keyboard/ngx';
import { IonInput, PopoverController } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';
import { transparentPixelIconDataUrl } from 'src/app/helpers/picture.helpers';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';

@Component({
    selector: 'browser-titlebar',
    templateUrl: './titlebar.component.html',
    styleUrls: ['./titlebar.component.scss'],
})
export class BrowserTitleBarComponent extends TitleBarComponent {
    @ViewChild('input', { static: false }) input: IonInput;

    public _url = "";
    public _title: string = null;
    public browserMode = true; // Whether dappbrowser page or home page

    public showTitleAndUrl = false;

    public inputStatus = new BehaviorSubject<boolean>(false); // Whether the url input control is focused (typing url) or not.

    @Input()
    set url(url: string) {
        this._url = url;
    }

    @Output() urlConfirmed = new EventEmitter<string>(); // URL change after finalization
    @Output() urlChanged = new EventEmitter<string>(); // URL while being typed (but incomplete)

    emit() {
        Logger.log("browser", "URL bar - request go browse to url:", this._url);
        if (this._url && this._url !== "") {
            this.keyboard.hide();
            let fixedUrl: string = this._url;
            if (!fixedUrl.startsWith("http"))
                fixedUrl = "https://" + fixedUrl;
            this.urlConfirmed.emit(fixedUrl);
        }
    }

    constructor(
        public themeService: GlobalThemeService,
        public popoverCtrl: PopoverController,
        public globalNav: GlobalNavService,
        public globalNotifications: GlobalNotificationsService,
        private networkService: WalletNetworkService,
        zone: NgZone,
        cdr: ChangeDetectorRef,
        public keyboard: Keyboard,
    ) {
        super(themeService, popoverCtrl, globalNav, zone, cdr, globalNotifications);
    }

    public setTitle(title: string): void {
        super.setTitle(title);
        this.updateTitleAreaDisplay();
    }

    public setUrl(url: string) {
        this._url = url;
        this.updateTitleAreaDisplay();
    }

    private updateTitleAreaDisplay() {
        if (!this.browserMode) {
            // Non browser mode (home screen): never show the title
            this.showTitleAndUrl = false;
        }
        else {
            if (this._title || this._url)
                this.showTitleAndUrl = true;
            else
                this.showTitleAndUrl = false;
        }
    }

    public onInputFocus() {
        this.inputStatus.next(true);
    }

    public onInputBlur() {
        // When the input is blurred (focus lost), show the page title and url again, if
        // there are some.
        this.updateTitleAreaDisplay();

        this.inputStatus.next(false);
    }

    // Key typed while input is focused
    public onInputKey(currentUrl: string) {
        this.urlChanged.next(currentUrl);
    }

    public setBrowserMode(browserMode: boolean) {
        this.browserMode = browserMode;
        if (browserMode) {
            this.setIcon(TitleBarIconSlot.INNER_RIGHT, { key: "network", iconPath: BuiltInIcon.NETWORK });
            this.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: "menu", iconPath: BuiltInIcon.VERTICAL_MENU });
        }
    }

    public getMiddleColumnSize(): number {
        if (this._title)
            return 7;

        if (this.browserMode) {
            return 7;
        }
        else {
            return 9.25; // No right icons, more space for the input box
        }
    }

    /**
     * Whether the top left icon shows a close icon, or a elastos icon.
     */
    public setCloseMode(closeMode: boolean) {
        if (closeMode) {
            this.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: "close", iconPath: BuiltInIcon.CLOSE });
        }
    }

    getIconPath(iconSlot: TitleBarIconSlot) {
        if (this.icons[iconSlot].iconPath == BuiltInIcon.NETWORK) {
            // Note: sometimes the active network can be null for a while
            if (this.networkService.activeNetwork.value)
                return this.networkService.activeNetwork.value.logo;
            else
                return transparentPixelIconDataUrl();
        }
        else {
            return super.getIconPath(iconSlot);
        }
    }

    onIconClicked(iconSlot: TitleBarIconSlot) {
        this.listenableIconClicked(this.icons[iconSlot]);
    }

    /**
     * Switch between title display and input box
     */
    public toggleTitle() {
        // Non browser mode (home) should never toggle.
        if (!this.browserMode)
            return;

        this.showTitleAndUrl = !this.showTitleAndUrl;

        if (!this.showTitleAndUrl) {
            // Wait a moment until the input has been shown by angular
            setTimeout(() => {
                void this.input.setFocus();
            }, 500);
        }
    }
}
