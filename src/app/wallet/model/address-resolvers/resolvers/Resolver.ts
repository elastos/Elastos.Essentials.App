import { AnySubWallet } from '../../wallets/subwallet';
import { Address } from "../addresses/Address";

export abstract class Resolver {
    public abstract getName(): string;
    public abstract resolve(name: string, subWallet: AnySubWallet): Promise<Address[]>
}