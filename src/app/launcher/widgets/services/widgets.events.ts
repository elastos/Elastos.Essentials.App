import { BehaviorSubject } from "rxjs";

/**
 * Extracted from the WidgetsService to avoid circular dependencies
 */
export class WidgetsServiceEvents {
  public static editionMode = new BehaviorSubject(false);
}