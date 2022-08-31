import { Logger } from "src/app/logger";
import { AnySubWallet } from '../../networks/base/subwallets/subwallet';
import { Address } from '../addresses/Address';
import { ELADomainAddress } from '../addresses/ELADomainAddress';
import { Resolver } from "./Resolver";
const domainjs = require('eladomainjs');

export class ELADomainResolver extends Resolver {
    private eladomainSDK = null;

    constructor() {
        super();

        this.init();
    }

    private init() {
        const config =
            {
            testnet:{
                rpcUrl: "",
                contractAddress: ""
            },
            mainnet:{
                rpcUrl: "https://api.elastos.io/eth",
                contractAddress: "0xA1019535E6b364523949EaF45F4B17521c1cb074"
            },
            defaultNetwork: "mainnet"
        }
        this.eladomainSDK = domainjs.SDK(config);
    }

    public getName(): string {
        return "ELADomain";
    }

    public async resolve(name: string, subWallet: AnySubWallet): Promise<Address[]> {
        let addresses: Address[] = [];

        if (!name.endsWith('.ela')) {
            name = name + '.ela'
        }

        Logger.log('wallet', "Searching name " + name + " on ELA Domain...");

        try {
            let result = await this.eladomainSDK.getOwner(name, false);
            if (result && result.owner) {
                let address = result.owner;
                if (!subWallet || await subWallet.isAddressValid(address)) {
                    addresses.push(new ELADomainAddress(name, address, ''));
                }
            }
        }
        catch (err) {
            // Name not found will throw an error, so we just return nothing.
        }

        return addresses;
    }
}