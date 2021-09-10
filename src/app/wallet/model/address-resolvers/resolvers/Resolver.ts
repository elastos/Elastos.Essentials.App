import { CoinID } from '../../coin';
import { Address } from "../addresses/Address";

export abstract class Resolver {
    public abstract resolve(name: string, coin: CoinID): Promise<Address[]>
}