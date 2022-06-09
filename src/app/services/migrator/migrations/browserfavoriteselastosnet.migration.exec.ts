import { BrowserFavorite } from "src/app/dappbrowser/model/favorite";
import { DappBrowserService } from "src/app/dappbrowser/services/dappbrowser.service";
import { Logger } from "src/app/logger";
import { IdentityEntry } from "src/app/model/didsessions/identityentry";
import { GlobalStorageService } from "../../global.storage.service";
import { DIDSessionsStore } from './../../stores/didsessions.store';

export const migrate = async (identityEntry: IdentityEntry): Promise<void> => {
  // Simplification: we just clear all recent apps, instead of converting them.
  await DappBrowserService.instance.clearRecentApps();

  // Convert favorites
  let favorites: BrowserFavorite[] = await GlobalStorageService.instance.getSetting(
    DIDSessionsStore.signedInDIDString,
    "dappbrowser", "favorites", []);

  let changeCount = 0;
  for (let favorite of favorites) {
    if (favorite.networks) {
      let elastosEntryIndex = favorite.networks.indexOf("elastos");
      if (elastosEntryIndex >= 0) {
        // elastos selected for favorites. Replace with "elastossmartchain".
        favorite.networks.splice(elastosEntryIndex, 1, "elastossmartchain");
        changeCount++;
      }
    }
  }

  Logger.log("migrations", `Migrated ${changeCount} favorites from elastos to elastossmartchain network`);

  await GlobalStorageService.instance.setSetting(DIDSessionsStore.signedInDIDString, "dappbrowser", "favorites", favorites);
}
