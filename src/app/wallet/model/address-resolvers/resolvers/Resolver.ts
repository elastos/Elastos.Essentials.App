import { AnySubWallet } from '../../networks/base/subwallets/subwallet';
import { Address } from "../addresses/Address";

export abstract class Resolver {
    public abstract getName(): string;
    public abstract resolve(name: string, subWallet: AnySubWallet): Promise<Address[]>
    public abstract stop(): void;
}