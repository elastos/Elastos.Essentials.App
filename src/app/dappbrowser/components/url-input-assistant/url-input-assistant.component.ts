import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { BrowsedAppInfo } from '../../model/browsedappinfo';
import { DappBrowserService } from '../../services/dappbrowser.service';

@Component({
    selector: 'url-input-assistant',
    templateUrl: './url-input-assistant.component.html',
    styleUrls: ['./url-input-assistant.component.scss'],
})
export class URLInputAssistantComponent {
    private rawRecentApps: BrowsedAppInfo[] = [];
    public recentApps: BrowsedAppInfo[] = [];

    private _filter = "";
    @Input()
    set filter(filter: string) {
        this._filter = filter;
        void this.prepareRecentApps();
    }

    @Output()
    public urlPicked = new EventEmitter<string>();

    constructor(
        public themeService: GlobalThemeService,
        private dAppBrowserService: DappBrowserService
    ) {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        dAppBrowserService.recentApps.subscribe(async recentApps => {
            this.rawRecentApps = await this.dAppBrowserService.getRecentAppsWithInfo();
            void this.prepareRecentApps();
        });
    }

    private prepareRecentApps() {
        if (!this._filter)
            return this.recentApps = this.rawRecentApps; // No filter; return everything

        this.recentApps = this.rawRecentApps.filter(ra => {
            return (
                ra.title && ra.title.includes(this._filter) ||
                ra.description && ra.description.includes(this._filter) ||
                ra.url && ra.url.includes(this._filter)
            );
        });

        // Don't keep too many results
        this.recentApps = this.recentApps.slice(0, 20);
    }

    public onRecentAppClicked(recentApp: BrowsedAppInfo) {
        this.urlPicked.emit(recentApp.url);
    }

    public getShortRecentAppDescription(recentApp: BrowsedAppInfo): string {
        if (!recentApp.description)
            return "";

        const limit = 50;
        if (recentApp.description.length < limit)
            return recentApp.description;
        else
            return recentApp.description.substring(0, limit) + "...";
    }
}
