import { HttpClient } from '@angular/common/http';
import Resolution from '@unstoppabledomains/resolution';
import { Logger } from "src/app/logger";
import { HECOMainNetNetwork } from '../../networks/heco/heco.mainnet.network';
import { AnySubWallet } from '../../wallets/subwallet';
import { Address } from '../addresses/Address';
import { Resolver } from "./Resolver";

export class UnstoppableDomainsAddressResolver extends Resolver {
    constructor(private http: HttpClient) {
        super();
    }

    public getName(): string {
        return "Unstoppable Domains";
    }

    /**
     * Returns UD's record key to be used for a given Essential's network.
     */
    private resolutionRecordKeyForWallet(subWallet: AnySubWallet): string {
        if (subWallet.networkWallet.network instanceof HECOMainNetNetwork)
            return "crypto.HT.address";
        return null;
    }

    // SUpported record keys list: https://github.com/unstoppabledomains/dot-crypto/blob/master/src/supported-keys/supported-keys.json
    public async resolve(name: string, subWallet: AnySubWallet): Promise<Address[]> {
        let addresses: Address[] = [];

        let recordKey = this.resolutionRecordKeyForWallet(subWallet);
        if (!recordKey)
            return [];

        Logger.log('wallet', "Searching name", name, "with key", recordKey, "on unstoppable domains...");

        try {
            const resolution = new Resolution();

            let results = await resolution.records(name, [recordKey]);
            console.log(`Domain ${name} results:`, results);

            return [];

            /*  var url = "https://" + name + ".elastos.name/ela.address";
             let address = await this.http.get(url, {
                 responseType: "text"
             }).toPromise();

             if (address) {
                 addresses.push(new CryptoNameAddress(name, address));
             } */
        }
        catch (err) {
            Logger.error("wallet", "Unstoppable domains error:", err);
        }

        return addresses;
    }
}