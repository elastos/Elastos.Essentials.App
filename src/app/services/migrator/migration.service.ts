import { Injectable } from "@angular/core";
import { sleep } from "src/app/helpers/sleep.helper";
import { Logger } from "src/app/logger";
import { App } from "src/app/model/app.enum";
import { IdentityEntry } from "src/app/model/didsessions/identityentry";
import { GlobalTranslationService } from "src/app/services/global.translation.service";
import { GlobalNavService } from "../global.nav.service";
import { GlobalStorageService } from "../global.storage.service";
import { NetworkTemplateStore } from "../stores/networktemplate.store";
import { DIDSessionsStore } from './../stores/didsessions.store';
import { Migration } from "./migration";
import { BrowserFavoritesElastosNetworkSplitMigration } from "./migrations/browserfavoriteselastosnet.migration";
import { JSWalletListMigration } from "./migrations/jswalletlist.migration";

/**
 * IMPORTANT: INCREMENT THIS VERSION EVERY TIME A NEW MIGRATION IS ADDED OTHERWISE NEW MIGRATIONS
 * WON'T BE APPLIED.
 *
 * EACH MIGRATION MUST HAVE A DIFFERENT ID
 */
const LATEST_MIGRATION_ID = 2;

type MigrationEvent = {
  event: "migrationstarting" | "migrationcompleted" | "migrationerror",
  migration: Migration;
  migrationStep: number; // Step index, within the 0 -> totalMigrations-1 range.
  error?: string;
}

type MigrationCallback = (event: MigrationEvent) => void;
type StatsCallback = (totalMigrations: number) => void;

/**
 * Service responsible for applying mandatory data conversions when Essentials starts.
 * Independant (but ordered) "migrations" can do whatever they want to convert some old data in order to
 * fir the new architecture or model inside essentials.
 *
 * Migrations are applied independently for each signed in DID, when such DID signs in. Not all at
 * once for all DIDs.
 */
@Injectable({
  providedIn: 'root'
})
export class MigrationService {
  // IMPORTANT: KEEP THIS LIST ORDERED FROM OLD TO RECENT TO RUN MIGRATIONS IN THE RIGHT ORDER
  // Keep this list here, not in global const, as it depends on the translation service to be ready
  private MIGRATIONS: Migration[];

  private identityToMigrate: IdentityEntry; // DID that has to be migrated - set after a checkAndMigrate() process is started
  private onGoingMigrationResolver: (value: void | PromiseLike<void>) => void;

  constructor(
    private storage: GlobalStorageService,
    private globalNavService: GlobalNavService,
    private translate: GlobalTranslationService, // for init
  ) {
    this.MIGRATIONS = [
      // Convert wallets list managed by the SPVSDK into a JS/App side management (reduce dependencies to the SPVSDK)
      new JSWalletListMigration(1),
      new BrowserFavoritesElastosNetworkSplitMigration(2)
    ];
  }

  /**
   * Checks if some migrations have to be done for this DID. If so, this method resolves only
   * after everything is completed. UI is totally blocked.
   */
  public async checkAndNavigateToMigration(identityToMigrate: IdentityEntry): Promise<void> {

    //await this.debugClearMigrationState(identityToMigrate); // TMP DEBUG

    // No migrations are due? Directly exit and probably continue to the real sign in
    if (!await this.migrationsRequiredForDID(identityToMigrate.didString))
      return;

    // Some migrations are required - block the caller until completed.
    return new Promise(resolve => {
      // Save the resolve callback for later fullfilment, after all migrations are completed
      this.onGoingMigrationResolver = resolve;

      this.identityToMigrate = identityToMigrate;

      // Show migration UI
      void this.navigateToMigrations();
    })
  }

  /**
   * The on going migration is completed
   */
  public continueAfterSuccessfulMigration() {
    Logger.log("migrations", "Migration is successfully completed, unblocking");

    // Migration completed, unlock the pending migration flow to probably continu to real user sign in (DID sessions)
    this.onGoingMigrationResolver();
  }

  /**
   * Used to notify this migration service when a new DID session is created.
   * When a session is created, we save the current migration ID to the DID settings, to make sure
   * we run only the new migrations in the future.
   */
  public onDIDSessionCreated(did: string): Promise<void> {
    return this.saveLastCheckedMigrationId(did, LATEST_MIGRATION_ID);
  }

  private saveLastCheckedMigrationId(did: string, id: number): Promise<void> {
    Logger.log("migrations", "Marking DID with last checked migration ID " + id);
    return this.storage.setSetting(did, NetworkTemplateStore.networkTemplate, "migrations", "lastCheckedMigrationId", id);
  }

  /**
   * Tells if some migrations are due for a given DID user/context.
   */
  public async migrationsRequiredForDID(did: string): Promise<boolean> {
    if (this.MIGRATIONS.length == 0)
      return false;

    // Old users (before migrations where introduced) don't have lastCheckedMigrationId so we consider they are
    // at ID 0, meaning that all migrations must be ran for them.
    let lastCheckedMigrationId = await this.storage.getSetting(did, NetworkTemplateStore.networkTemplate, "migrations", "lastCheckedMigrationId", 0);

    if (LATEST_MIGRATION_ID > lastCheckedMigrationId)
      Logger.log("migrations", `Migration is required: LATEST_MIGRATION_ID ${LATEST_MIGRATION_ID} > lastCheckedMigrationId ${lastCheckedMigrationId}`);

    return LATEST_MIGRATION_ID > lastCheckedMigrationId;
  }

  private navigateToMigrations(): Promise<boolean> {
    return this.globalNavService.navigateRoot(App.MIGRATOR, "/migrator/home");
  }

  /**
   * Called by the migration UI to start the actual migrations.
   */
  public async runMigrations(statsCallback: StatsCallback, migrationCallback: MigrationCallback): Promise<boolean> {
    let lastCheckedMigrationId = await this.storage.getSetting(this.identityToMigrate.didString, NetworkTemplateStore.networkTemplate, "migrations", "lastCheckedMigrationId", 0);

    let migrationsToRun = this.MIGRATIONS.filter(migration => migration.uniquelyIncrementedId > lastCheckedMigrationId);
    statsCallback(migrationsToRun.length);

    // Simulate the target DID as the "signed in" one because many APIs relied on this field
    DIDSessionsStore.signedInDIDString = this.identityToMigrate.didString;

    // Run all the migrations that were added at a migration ID higher than current user's most recent check
    let migrationStep = 0;
    for (let migration of migrationsToRun) {
      // Run the migration
      migrationCallback({ event: "migrationstarting", migration, migrationStep });

      Logger.log("migrations", `Running migration ID ${migration.uniquelyIncrementedId} for DID ${this.identityToMigrate.didString}`);

      try {
        await Promise.all([
          migration.migrate(this.identityToMigrate),
          sleep(3000) // Wait a minimal time for each migration, so user has time to read
        ]);
        Logger.log("migrations", `Migration ID ${migration.uniquelyIncrementedId} is completed`);

        migrationCallback({ event: "migrationcompleted", migration, migrationStep });
        await this.saveLastCheckedMigrationId(this.identityToMigrate.didString, migration.uniquelyIncrementedId);
      }
      catch (e) {
        Logger.error("migrations", `Migration ID ${migration.uniquelyIncrementedId} has failed!`, e);

        migrationCallback({ event: "migrationerror", migration, migrationStep, error: new String(e).toString() });
        return false; // FATAL ERROR - ESSENTIALS REMAINS BLOCKED ON THE MIGRATION SCREEN
      }

      migrationStep++;
    }

    // Restore the "signed in identity" to none - DID sessions flow will handle this for real.
    DIDSessionsStore.signedInDIDString = null;

    return true;
  }

  /**
   * DEBUG ONLY - Resets migration index state to restart all migrations from 0.
   */
  private async debugClearMigrationState(identityEntry: IdentityEntry): Promise<void> {
    // Simulate the target DID as the "signed in" one because many APIs relied on this field
    DIDSessionsStore.signedInDIDString = identityEntry.didString;

    await this.saveLastCheckedMigrationId(identityEntry.didString, 0);

    // Let migrations reset their own data
    for (let migration of this.MIGRATIONS) {
      await migration.debugClearMigrationState(identityEntry);
    }

    DIDSessionsStore.signedInDIDString = null;
  }
}