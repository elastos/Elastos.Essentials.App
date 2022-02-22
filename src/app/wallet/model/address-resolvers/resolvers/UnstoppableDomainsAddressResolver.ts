import { HttpClient } from '@angular/common/http';
import Resolution from '@unstoppabledomains/resolution';
import { Logger } from "src/app/logger";
import { BSCMainNetNetwork } from '../../networks/bsc/bsc.mainnet.network';
import { ElastosMainChainMainNetNetwork, ElastosSmartChainMainNetNetwork } from '../../networks/elastos/elastos.mainnet.network';
import { EthereumMainNetNetwork } from '../../networks/ethereum/ethereum.mainnet.network';
import { FantomMainNetNetwork } from '../../networks/fantom/fantom.mainnet.network';
import { HECOMainNetNetwork } from '../../networks/heco/heco.mainnet.network';
import { EscSubWallet } from '../../wallets/elastos/standard/subwallets/esc.evm.subwallet';
import { MainChainSubWallet } from '../../wallets/elastos/standard/subwallets/mainchain.subwallet';
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
        if (subWallet.networkWallet.network instanceof ElastosMainChainMainNetNetwork) {
            if (subWallet instanceof MainChainSubWallet)
                return "crypto.ELA.version.ELA.address";
            else
                return null;
        }
        else if (subWallet.networkWallet.network instanceof ElastosSmartChainMainNetNetwork) {
            if (subWallet instanceof EscSubWallet)
                return "crypto.ELA.version.ESC.address";
            else
                return null;
        }
        else if (subWallet.networkWallet.network instanceof EthereumMainNetNetwork)
            return "crypto.ETH.address";
        else if (subWallet.networkWallet.network instanceof HECOMainNetNetwork)
            return "crypto.HT.address";
        else if (subWallet.networkWallet.network instanceof BSCMainNetNetwork)
            return "crypto.BNB.address";
        else if (subWallet.networkWallet.network instanceof FantomMainNetNetwork)
            return "crypto.FTM.version.OPERA.address";
        // TODO: Tron -> crypto.TRX.address
        // TODO: Avalanche ->crypto.AVAX.address
        // NOTE (2021.10) FSN (fusion) not available in UD
        // NOTE (2021.10) AETH (arbitrum) not available in UD - should we use the ETH address?
        // NOTE (2021.10) MATIC (polygon) native token not available in UD. Only *.MATIC verions of ERC20 tokens.
        return null;
    }

    /**
     * Supported record keys list: https://github.com/unstoppabledomains/uns/blob/main/resolver-keys.json
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
            //let name = "udtestdev-ben.crypto"; // TMP TEST
            /* const resolution = Resolution.infura("9aa3d95b3bc440fa88ea12eaa4456161", {
                uns: { network: "rinkeby" }
            }); */

            //let results = await resolution/* .records(name, [recordKey]); // */.allRecords(name);

            let resolution = new Resolution();
            let results = await resolution.records(name, [recordKey]);
            console.log(`Domain ${name} results:`, results);

            if (recordKey in results)
                return [new UnstoppableDomainsAddress(name, results[recordKey])];
        }
        catch (err) {
            //console.error("TMP", err);
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