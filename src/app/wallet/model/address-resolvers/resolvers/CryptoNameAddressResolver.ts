import { HttpClient } from '@angular/common/http';
import { Logger } from "src/app/logger";
import { StandardCoinName } from '../../coin';
import { AnySubWallet } from '../../networks/base/subwallets/subwallet';
import { Address } from '../addresses/Address';
import { CryptoNameAddress } from '../addresses/CryptoNameAddress';
import { Resolver } from "./Resolver";

export class CryptoNameResolver extends Resolver {
    constructor(private http: HttpClient) {
        super();
    }

    public getName(): string {
        return "CryptoName";
    }

    public async resolve(name: string, subWallet: AnySubWallet): Promise<Address[]> {
        let addresses: Address[] = [];

        if (!subWallet)
            return [];

        // Cryptoname can resolve only from ELA mainchain
        if (subWallet.isStandardSubWallet() && subWallet.id === StandardCoinName.ELA) {
            Logger.log('wallet', "Searching name " + name + " on cryptoname...");

            try {
                var url = "https://" + name + ".elastos.name/ela.address";
                let address = await this.http.get(url, {
                    responseType: "text"
                }).toPromise();

                if (address) {
                    addresses.push(new CryptoNameAddress(name, address));
                }
            }
            catch (err) {
                // Name not found will throw an error, so we just return nothing.
            }
        }

        return addresses;
    }
}