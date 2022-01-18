import { Injectable } from '@angular/core';
import moment from 'moment';

export type RedPacketTheme = {
  key: string; // Unique key for reference, localization
  thumbnailImage: string; // Small picture, as shown during packet creation
  fullImage: string; // Large picture, as used on the packet details screen
  targetMonth?: number; // 0-11 : Month of the special occasion, if any. eg: 11 for Christmas (December)
}

const themes: RedPacketTheme[] = [
  // Keep "default" always first in this list
  {
    key: "default",
    thumbnailImage: "assets/redpackets/images/themes/cat_default.svg",
    fullImage: "assets/redpackets/images/themes/cat_default_details.png"
  },
  {
    key: "summer_holidays",
    thumbnailImage: "assets/redpackets/images/themes/cat_summer_holidays.svg",
    fullImage: "assets/redpackets/images/themes/cat_summer_holidays_details.png",
    targetMonth: 5
  },
  {
    key: "cny",
    thumbnailImage: "assets/redpackets/images/themes/cat_cny.png",
    fullImage: "assets/redpackets/images/themes/cat_cny_details.png",
    targetMonth: 0
  }
]

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  constructor() { }

  /**
   * Returns the available themes, sorted by "coming soon" smart order:
   * Default theme > Coming soon themes > No target month themes
   */
  public getAvailableThemes(): RedPacketTheme[] {
    let currentMonth = moment().get("month");
    return themes.sort((m1, m2) => {
      // Special case 'default': always first, so we use the current month (highest priority)
      let m1Month = m1.key === 'default' ? currentMonth : m1.targetMonth;
      if (m1Month === undefined)
        m1Month = (currentMonth + 12 - 1) % 12; // Simulate a month in a long time. ie if currently month 5, set unknown month to th previous month => 4

      let m2Month = m2.key === 'default' ? currentMonth : m2.targetMonth;
      if (m2Month === undefined)
        m2Month = (currentMonth + 12 - 1) % 12;

      let diff = (m1Month - currentMonth + 12) % 12 - (m2Month - currentMonth + 12) % 12;
      //console.log("M1", m1.key, m1Month, "M2", m2.key, m2Month, "DIFF", diff);

      return diff;
    });
  }

  public getDefaultTheme(): RedPacketTheme {
    return themes[0]; // "Default"
  }

  public getThemeByKey(key: string): RedPacketTheme {
    return themes.find(t => t.key === key);
  }
}
