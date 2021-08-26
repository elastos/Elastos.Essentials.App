import { Resolver } from "./Resolver"
import { Address } from '../addresses/Address';
import { CoinID, StandardCoinName } from '../../Coin';
import { CryptoNameAddress } from '../addresses/CryptoNameAddress';
import { HttpClient } from '@angular/common/http';
import { Logger } from "src/app/logger";

export class CryptoNameResolver extends Resolver {
    constructor(private http: HttpClient) {
        super();
    }

    public async resolve(name: string, coin: CoinID): Promise<Address[]> {
        let addresses: Address[] = [];

        if (coin == StandardCoinName.ELA) {
            Logger.log('wallet', "Searching name "+name+" on cryptoname...");

            try {
                var url = "https://"+name+".elastos.name/ela.address";
                let address = await this.http.get(url, {
                    responseType: "text"
                }).toPromise();

                if (address) {
                    addresses.push(new CryptoNameAddress(name, address));
                }
            }
            catch(err) {
                // Name not found will throw an error, so we just return nothing.
            }
        }

        return addresses;
    }
}