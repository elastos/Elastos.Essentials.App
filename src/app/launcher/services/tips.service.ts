import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Tip } from '../model/tip.model';
import { TipAudience } from '../model/tipaudience.model';
import * as moment from 'moment';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { Logger } from 'src/app/logger';
import { GlobalNotificationsService } from 'src/app/services/global.notifications.service';
import { App } from 'src/app/model/app.enum';

const DURATION_MIN_BETWEEN_2_TIPS_HOURS = 12; // 12 hours
const DURATION_BETWEEN_2_CHECKS_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Service responsible for rotating tips displayed to users as notifications,
 * in order to better understand Elastos Essentials.
 */
@Injectable({
  providedIn: 'root'
})
export class TipsService {
  // NOTE: The following tips are displayed in the same order they are in the list below:
  private tips: Tip[] = [
    {
      title: "launcher.tip-title-welcome",
      message: "launcher.tip-message-welcome",
      audience: TipAudience.FOR_ELASTOS_TRINITY_GENERIC
    },
    {
      title: "launcher.tip-title-dev-getting-support",
      message: "launcher.tip-message-dev-getting-support",
      audience: TipAudience.FOR_ELASTOS_TRINITY_DEVELOPERS
    },
    {
      title: "launcher.tip-title-what-is-did",
      message: "launcher.tip-message-what-is-did",
      audience: TipAudience.FOR_ELASTOS_TRINITY_GENERIC
    },
    {
      title: "launcher.tip-title-what-is-hive",
      message: "launcher.tip-message-what-is-hive",
      audience: TipAudience.FOR_ELASTOS_TRINITY_GENERIC
    },
    {
      title: "launcher.tip-title-toolbox",
      message: "launcher.tip-message-toolbox",
      audience: TipAudience.FOR_ELASTOS_TRINITY_GENERIC
    },
    {
      title: "launcher.tip-title-not-only-for-crypto-players",
      message: "launcher.tip-message-not-only-for-crypto-players",
      audience: TipAudience.FOR_ELASTOS_TRINITY_GENERIC
    },
    {
      title: "launcher.tip-title-bring-friends",
      message: "launcher.tip-message-bring-friends",
      audience: TipAudience.FOR_ELASTOS_TRINITY_GENERIC
    },
  ]

  constructor(
    private translate: TranslateService,
    private storage: GlobalStorageService,
    private prefs: GlobalPreferencesService,
    private notifications: GlobalNotificationsService) { }

  public init() {
    Logger.log("Launcher", "Tips service is initializing");

    // await this.resetAllTipsAsNotViewed(); // DEBUG ONLY

    // Wait a moment while the launcher starts, then start showing tips if needed.
    setTimeout(() => {
      void this.checkIfTimeToShowATip();
    }, 1000);
  }

  private async checkIfTimeToShowATip() {
    Logger.log("Launcher", "Checking if it's a right time to show a tip");

    if (!await this.userWantsToSeeTips()) {
      Logger.log('Launcher', "User doesn't want to see tips. Skipping.");
      return;
    }

    if (await this.rightTimeToShowATip()) {
      await this.showNextTip();
    }

    // No matter what, check again in X minutes
    setTimeout(() => {
      void this.checkIfTimeToShowATip();
    }, DURATION_BETWEEN_2_CHECKS_MS);
  }

  // Find the suitable tip to show next, and show it.
  private async showNextTip() {
    Logger.log('Launcher', "All tips:", this.tips);

    // Load tips that user has already viewed
    let viewedTips = await this.loadViewedTips();
    Logger.log('Launcher', "Viewed tips:", viewedTips);

    // Exclude developer tips if user is not a developer, etc.
    let usableTips = await this.getAllTipsUserCanView();

    // Exclude viewed tips from the whole list of tips
    usableTips = this.tips.filter((tip) => {
      return viewedTips.find((t) => {
        return t.title == tip.title;
      }) == null;
    });

    Logger.log('Launcher', "Usable tips:", usableTips);

    // Take the first usable tip of the list, if any.
    if (usableTips.length > 0) {
      let tipToNotify = usableTips[0];

      // In order to be able to pass more advanced data, we send the message as a JSON string that is
      // parsed by the notification manager.
      let jsonMessage = {
        type: "tip",
        key: tipToNotify.title,
        message: this.translate.instant(tipToNotify.message)
      }

      void this.notifications.sendNotification({
        app: App.LAUNCHER,
        key: "launcher_tip_of_the_day", // Always overwrite previous tip notifications, if any
        title: this.translate.instant(tipToNotify.title),
        message: JSON.stringify(jsonMessage)
      });

      // Save current time, so we can know when to show another tip next.
      await this.saveSentTipTime();
    }
  }

  private async rightTimeToShowATip(): Promise<boolean> {
    try {
      let value = await this.storage.getSetting<string>(GlobalDIDSessionsService.signedInDIDString, "launcher", "latest-sent-tip-time", null);
      if (!value)
        return true; // Nothing saved yet: so it's a right time to show a tip.

      // value must be a ISO string
      let latestSentTipTime = moment(value);

      //Logger.log('Launcher', latestSentTipTime, moment())

      // Right time to show if last time we have shown a tip was more than X hours ago.
      return (latestSentTipTime.add(DURATION_MIN_BETWEEN_2_TIPS_HOURS, "hours").isBefore(moment()));
    }
    catch (err) {
      Logger.error('Launcher', "rightTimeToShowATip() error:", err);
      return true;
    }
  }

  private async saveSentTipTime() {
    try {
      await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "launcher", "latest-sent-tip-time", new Date().toISOString());
    }
    catch (err) {
      // Kind of blocking issue, but let's resolve anyway...
      Logger.error('Launcher', "saveSentTipTime() error:", err);
    }
  }

  /**
   * Returns the list of all tips the current user is entitled to view. For example a non developer
   * should never see any developer tip.
   */
  public async getAllTipsUserCanView(): Promise<Tip[]> {
    let isDeveloperModeEnabled = await this.developerModeEnabled();

    let tipsThatCanBeViewed = this.tips;
    if (!isDeveloperModeEnabled) {
      tipsThatCanBeViewed = tipsThatCanBeViewed.filter((tip) => {
        return tip.audience != TipAudience.FOR_ELASTOS_TRINITY_DEVELOPERS;
      });
    }

    return tipsThatCanBeViewed;
  }

  private async userWantsToSeeTips(): Promise<boolean> {
    try {
      let value = await this.prefs.getPreference<boolean>(GlobalDIDSessionsService.signedInDIDString, "help.dailytips.show");
      return value;
    }
    catch (err) {
      // Preference does not exist - Consider this as a yes
      return true;
    }
  }

  public async markTipAsViewed(tip: Tip) {
    let viewedTips = await this.loadViewedTips();
    viewedTips.push(tip);

    await this.saveViewedTips(viewedTips);
  }

  /**
   * Forbids all tips read by user and restarts the tips scheduling from 0 as if this was a new user.
   */
  public async resetAllTipsAsNotViewed(): Promise<void> {
    await this.saveViewedTips([]);
  }

  public findTipByIdentifier(identifier: string): Tip {
    return this.tips.find((tip) => {
      return tip.title == identifier;
    });
  }

  private saveViewedTips(tips: Tip[]): Promise<void> {
    return this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "launcher", "viewed-tips", tips);
  }

  private async loadViewedTips(): Promise<Tip[]> {
    try {
      let tips = await this.storage.getSetting<Tip[]>(GlobalDIDSessionsService.signedInDIDString, "launcher", "viewed-tips", []);
      return tips;
    }
    catch (err) {
      return [];
    }
  }

  private async developerModeEnabled(): Promise<boolean> {
    try {
      let devMode = await this.prefs.getPreference(GlobalDIDSessionsService.signedInDIDString, "developer.mode");
      if (devMode)
        return true;
      else
        return false;
    }
    catch (err) {
      Logger.warn('Launcher', "developerModeEnabled() error", err);
      return false;
    }
  }
}
