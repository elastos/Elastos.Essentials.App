import { Address } from "../addresses/Address";
import { CoinID } from '../../coin';

export abstract class Resolver {
    public abstract resolve(name: string, coin: CoinID): Promise<Address[]>
}