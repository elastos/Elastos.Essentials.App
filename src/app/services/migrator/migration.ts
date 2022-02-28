import type { IdentityEntry } from "../global.didsessions.service";

/**
 * Base interface for each migration that needs to be run.
 * One migration applies to a spceific DID context.
 */
export abstract class Migration {
  constructor(public uniquelyIncrementedId: number, public title: string) { }

  // Must throw an exception in case of error
  public abstract migrate(identityEntry: IdentityEntry): Promise<void>;

  public abstract debugClearMigrationState(identityEntry: IdentityEntry): Promise<void>;
}