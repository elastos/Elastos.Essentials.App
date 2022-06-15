import { Logger } from '../logger';

export const logAndReject = (module: string, reject: (reason: string) => void, reason: string): void => {
  Logger.error(module, "Rejecting promise", reason);
  reject(reason);
}