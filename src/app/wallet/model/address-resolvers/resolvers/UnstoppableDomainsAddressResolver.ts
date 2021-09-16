import { HttpClient } from '@angular/common/http';
import Resolution from '@unstoppabledomains/resolution';
import { Logger } from "src/app/logger";
import { EthereumMainNetNetwork } from '../../networks/ethereum/ethereum.mainnet.network';
import { AnySubWallet } from '../../wallets/subwallet';
import { Address } from '../addresses/Address';
import { UnstoppableDomainsAddress } from '../addresses/UnstoppableDomainsAddress';
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
        /* if (subWallet.networkWallet.network instanceof HECOMainNetNetwork)
            return "crypto.HT.address";
        else  */if (subWallet.networkWallet.network instanceof EthereumMainNetNetwork)
            return "crypto.ETH.address";
        // TODO: MAKE SURE WITH UD TEAM THAT crypto.HT.address IS THE REAL HT ON HECO + ADD OTHER NETWORKS
        return null;
    }

    /**
     * Supported record keys list: https://github.com/unstoppabledomains/dot-crypto/blob/master/src/supported-keys/supported-keys.json
     *
     * ben.crypto:
            crypto.BTC.address: "bc1qah84mry5mzp5ady8gdygzlrs0sc330qehgn969"
            crypto.ETH.address: "0x501F7e2c0EB8a2e221E0Ed8a9f96B4B79d44c4B5"
            crypto.LTC.address: "ltc1qnmyw6lt4wt99n9x5j2ykznj8eqjljpg8hnhcpr"
            crypto.XRP.address: "rDLcKBtubFcwA4hSnHrv9VW8bMV5jwDMYf"
     */
    public async resolve(name: string, subWallet: AnySubWallet): Promise<Address[]> {
        let addresses: Address[] = [];

        let recordKey = this.resolutionRecordKeyForWallet(subWallet);
        if (!recordKey)
            return [];

        Logger.log('wallet', "Searching name", name, "with key", recordKey, "on unstoppable domains...");

        try {
            const resolution = new Resolution();

            let results = await resolution.records(name, [recordKey]); // .allRecords(name);
            console.log(`Domain ${name} results:`, results);

            if (recordKey in results)
                return [new UnstoppableDomainsAddress(name, results[recordKey])];
        }
        catch (err) {
            let errStr = new String(err);
            if (errStr.indexOf("not registered") > 0 || errStr.indexOf("not supported") > 0) {
                // Silence failure, handled
            }
            else {
                Logger.error("wallet", "Unstoppable domains error:", err);
            }
        }

        return addresses;
    }
}