import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, RefresherCustomEvent } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, TitleBarMenuItem, TitleBarSlotItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { App } from 'src/app/model/app.enum';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { PollStatus } from '../../model/poll-status.enum';
import { Poll } from '../../model/poll.model';
import { MainchainPollsService } from '../../services/mainchain-polls.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit, OnDestroy {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;
  @ViewChild('content', { static: false }) content: IonContent;

  public polls: Poll[] = [];
  public pollsFetched = false;
  public loading = true;
  private titleBarIconClickedListener?: (icon: TitleBarSlotItem | TitleBarMenuItem) => void;

  constructor(
    public theme: GlobalThemeService,
    private pollsService: MainchainPollsService,
    private router: Router,
    private globalNav: GlobalNavService,
    public translate: TranslateService
  ) {}

  ngOnInit() {}

  ionViewWillEnter() {
    void this.init();
  }

  ngOnDestroy() {
    if (this.titleBarIconClickedListener) {
      this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    }
    this.titleBar.setIcon(TitleBarIconSlot.INNER_RIGHT, null);
  }

  async init() {
    this.titleBar.setTitle(this.translate.instant('mainchainpolls.title'));

    // Set up refresh icon
    this.setupRefreshIcon();

    // Only fetch polls if they haven't been fetched yet
    if (!this.pollsFetched) {
      await this.fetchPolls();
    }
  }

  setupRefreshIcon() {
    // Set refresh icon on inner right slot
    const refreshIconPath = 'assets/shared/curcol-icons/reload.svg';
    const darkmodeRefreshIconPath = 'assets/shared/curcol-icons/darkmode/reload.svg';

    this.titleBar.setIcon(TitleBarIconSlot.INNER_RIGHT, {
      key: 'refresh',
      iconPath: this.theme.darkMode ? darkmodeRefreshIconPath : refreshIconPath
    });

    // Set up click listener only if not already set up
    if (!this.titleBarIconClickedListener) {
      this.titleBarIconClickedListener = (icon: TitleBarSlotItem | TitleBarMenuItem) => {
        if (icon.key === 'refresh') {
          void this.refreshPolls();
        }
      };
      this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener);
    }
  }

  async refreshPolls() {
    this.pollsService.clearCache();
    this.pollsFetched = false;
    await this.fetchPolls();
  }

  async fetchPolls() {
    try {
      this.loading = true;
      Logger.log(App.MAINCHAIN_POLLS, 'Fetching polls...');

      // Get poll IDs
      const pollIds = await this.pollsService.getPolls();
      Logger.log(App.MAINCHAIN_POLLS, 'Poll IDs:', pollIds);

      if (pollIds.length === 0) {
        this.polls = [];
        this.pollsFetched = true;
        this.loading = false;
        return;
      }

      // Get voting info for all polls
      const pollInfo = await this.pollsService.getPollInfo(pollIds);
      Logger.log(App.MAINCHAIN_POLLS, 'Poll infos:', pollInfo);

      this.polls = pollInfo;

      this.pollsFetched = true;
      this.loading = false;
    } catch (err) {
      Logger.error(App.MAINCHAIN_POLLS, 'fetchPolls error:', err);
      this.loading = false;
      this.pollsFetched = true;
    }
  }

  async doRefresh(event: RefresherCustomEvent) {
    this.pollsService.clearCache();
    this.pollsFetched = false;
    await this.fetchPolls();
    void event.target.complete();
  }

  selectPoll(poll: Poll) {
    void this.globalNav.navigateTo(App.MAINCHAIN_POLLS, `/mainchainpolls/poll/${poll.id}`);
  }

  getStatusClass(status: PollStatus): string {
    switch (status) {
      case 'voting':
        return 'active';
      case 'finished':
        return 'ended';
      case 'upcoming':
        return 'upcoming';
      default:
        return '';
    }
  }

  formatDate(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  }
}
