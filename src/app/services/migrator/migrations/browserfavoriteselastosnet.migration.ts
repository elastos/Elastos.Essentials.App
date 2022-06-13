import { IdentityEntry } from "src/app/model/didsessions/identityentry";
import { GlobalTranslationService } from 'src/app/services/global.translation.service';
import { Migration } from "../migration";

/**
 * 2022-02-17
 * Elastos network was initially one network containing several "ELA" for mainchain, smart chain,
 * identity chain, and is now split into 3 different networks.
 * Browser favorites have to be adjusted (network key).
 */
export class BrowserFavoritesElastosNetworkSplitMigration extends Migration {
  constructor(uniquelyIncrementedId: number) {
    super(uniquelyIncrementedId, GlobalTranslationService.instance.translateInstant('migrator.migration-elastos-browser-favorites'));
  }

  public async migrate(identityEntry: IdentityEntry): Promise<void> {
    // Lazy loading to not load heavy dependencies when the migration is not needed.
    // eslint-disable-next-line import/no-cycle
    await (await import("./browserfavoriteselastosnet.migration.exec")).migrate(identityEntry);
  }

  public async debugClearMigrationState(identityEntry: IdentityEntry): Promise<void> {
  }
}