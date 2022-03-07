import { Error as WalletError } from "../ErrorChecker";

export class WalletErrorException extends Error {
  constructor(error: WalletError) {
    super(JSON.stringify(error));
  }
}