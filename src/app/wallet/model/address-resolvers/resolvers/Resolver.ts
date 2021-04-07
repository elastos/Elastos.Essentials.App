import { Address } from "../addresses/Address";
import { CoinID } from '../../Coin';

export abstract class Resolver {
    public abstract resolve(name: string, coin: CoinID): Promise<Address[]>
}