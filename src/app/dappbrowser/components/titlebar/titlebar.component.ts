import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIconSlot } from 'src/app/components/titlebar/titlebar.types';
import { transparentPixelIconDataUrl } from 'src/app/helpers/picture.helpers';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';

@Component({
    selector: 'browser-titlebar',
    templateUrl: './titlebar.component.html',
    styleUrls: ['./titlebar.component.scss'],
})
export class BrowserTitleBarComponent extends TitleBarComponent {
    public _url = "";
    public _title: string = null;
    public urlBoxColSize = 8.25;
    public browserMode = true; // Whether dappbrowser page or home page
    private closeMode = false; // Whether the top left icon shows a close icon, or a elastos icon.

    @Input()
    set url(url: string) {
        this._url = url;
    }

    @Output() urlChanged = new EventEmitter<string>();

    emit() {
        Logger.log("browser", "URL bar - request go browse to url:", this._url);
        if (this._url && this._url !== "") {
            let fixedUrl: string = this._url;
            if (!fixedUrl.startsWith("http"))
                fixedUrl = "https://" + fixedUrl;
            this.urlChanged.emit(fixedUrl);
        }
    }

    constructor(
        public themeService: GlobalThemeService,
        public popoverCtrl: PopoverController,
        public globalNav: GlobalNavService,
        public globalNotifications: GlobalNotificationsService,
        private networkService: WalletNetworkService
    ) {
        super(themeService, popoverCtrl, globalNav, globalNotifications);
    }

    public setUrl(url: string) {
        this._url = url;
    }

    public setBrowserMode(browserMode: boolean) {
        this.browserMode = browserMode;
        if (browserMode) {
            this.urlBoxColSize = 7;
            this.setIcon(TitleBarIconSlot.INNER_RIGHT, { key: "network", iconPath: BuiltInIcon.NETWORK });
            this.setIcon(TitleBarIconSlot.OUTER_RIGHT, { key: "menu", iconPath: BuiltInIcon.VERTICAL_MENU });
        }
        else {
            this.urlBoxColSize = 9.25;
        }
    }

    public setCloseMode(closeMode: boolean) {
        this.closeMode = closeMode;
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
}
