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
    public _url: string = "";
    public _title: string = null;

    @Input()
    set url(url: string) {
        this._url = url;
    }

    @Output() urlChanged = new EventEmitter<string>();


    private itemClickedListeners: ((no: number) => void)[] = [];

    emit() {
        Logger.log("browser", "URL bar - request go browse to url:", this._url);
        if (this._url && this._url !== "") {
            let fixedUrl: string = this._url.toLowerCase();
            if (!fixedUrl.startsWith("http"))
                fixedUrl = "https://" + fixedUrl;
            this.urlChanged.emit(fixedUrl);
        }
    }

    constructor(
        public theme: GlobalThemeService,
        public popoverCtrl: PopoverController,
        public globalNav: GlobalNavService,
        public globalNotifications: GlobalNotificationsService,
    ) { }


    onIconClicked(no: number) {
        // Custom icon, call the icon listener
        this.itemClickedListeners.forEach((listener) => {
            listener(no);
        });
    }

    /**
     * Adds a listener to be notified when an icon is clicked. This works for both flat icons
     * (setIcon()) and menu items (setupMenuItems()). Use the icon "key" field to know which
     * icon was clicked.
     *
     * @param onItemClicked Callback called when an item is clicked.
     */
    public addOnItemClickedListener(onItemClicked: (no: number) => void) {
        this.itemClickedListeners.push(onItemClicked);
    }

    /**
     * Remove a listener.
     *
     * @param onItemClicked Callback called when an item is clicked.
     */
    public removeOnItemClickedListener(onItemClicked: (no: number) => void) {
        this.itemClickedListeners.splice(this.itemClickedListeners.indexOf(onItemClicked), 1);
    }

    /**
     * Sets the main title bar title information. Pass null to clear the previous title.
     * Apps are responsible for managing this title from their internal screens.
     *
     * @param title Main title to show on the title bar. If title is not provided, the title bar shows the default title (the app name)
     */
    public setTitle(title: string) {
        this._title = title;
    }

    public setUrl(url: string) {
        this._url = url;
    }

    public getIconPath(no: number): string {
        // Replace built-in icon path placeholders with real picture path
        switch (no) {
            case 0:
                return this.theme.darkMode? 'assets/components/titlebar/darkmode/elastos.svg' : 'assets/components/titlebar/elastos.svg';
            case 1:
                return this.theme.darkMode ? 'assets/components/titlebar/darkmode/back.svg' : 'assets/components/titlebar/back.svg';
            case 2:
                return this.theme.darkMode ? 'assets/components/titlebar/darkmode/vertical_menu.svg' : 'assets/components/titlebar/vertical_menu.svg';
        }
    }

    public homeClicked() {
        void this.globalNav.navigateHome();
    }
}
