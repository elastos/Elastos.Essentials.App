import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
    selector: 'browser-titlebar',
    templateUrl: './titlebar.component.html',
    styleUrls: ['./titlebar.component.scss'],
})
export class BrowserTitleBarComponent {
    public _url = "http://192.168.1.3:8101" // "https://eager-ardinghelli-95206e.netlify.app/bridge"; // TMP "";

    @Input()
    set url(url: string) {
        this._url = url;
    }

    @Output() urlChanged = new EventEmitter<string>();

    emit() {
        Logger.log("browser", "URL bar - request go browse to url:", this._url);
        this.urlChanged.emit(this._url);
    }

    constructor(
        public theme: GlobalThemeService,
        public popoverCtrl: PopoverController,
        public globalNav: GlobalNavService,
        public globalNotifications: GlobalNotificationsService,
    ) { }

    public getEssentialsLogoPath(): string {
        if (this.theme.darkMode)
            return 'assets/components/titlebar/darkmode/elastos.svg';
        else
            return 'assets/components/titlebar/elastos.svg';
    }

    public homeClicked() {
        void this.globalNav.navigateHome();
    }
}
