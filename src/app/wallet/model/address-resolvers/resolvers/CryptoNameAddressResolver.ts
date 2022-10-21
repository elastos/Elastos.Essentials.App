import { HttpClient } from '@angular/common/http';
import { Logger } from "src/app/logger";
import { AnySubWallet } from '../../networks/base/subwallets/subwallet';
import { Address } from '../addresses/Address';
import { CryptoNameAddress } from '../addresses/CryptoNameAddress';
import { Resolver } from "./Resolver";

export class CryptoNameResolver extends Resolver {
    constructor(private http: HttpClient) {
        super();
    }

    public stop() {}

    public getName(): string {
        return "CryptoName";
    }

    public async resolve(name: string, subWallet: AnySubWallet): Promise<Address[]> {
        let addresses: Address[] = [];

        Logger.log('wallet', "Searching name " + name + " on cryptoname...");

        try {
            // var url = "https://" + name + ".elastos.name/ela.address";
            var url = "https://" + name + ".elastos.name/info.json";
            let result = await this.http.get(url, {
                responseType: "text"
            }).toPromise();

            if (result) {
              let resultObj = JSON.parse(result)
                for (var index in resultObj) {
                  if (index.endsWith('.address') && (!subWallet || await subWallet.isAddressValid(resultObj[index]))) {
                      addresses.push(new CryptoNameAddress(name, resultObj[index], index));
                  }
              }
            }
        }
        catch (err) {
            // Name not found will throw an error, so we just return nothing.
        }

        return addresses;
    }
}