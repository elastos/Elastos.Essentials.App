import { Subscription } from "rxjs";
import { Logger } from "src/app/logger";
import { WalletNetworkService } from "src/app/wallet/services/network.service";
import { AnySubWallet } from '../../networks/base/subwallets/subwallet';
import { Address } from '../addresses/Address';
import { ELADomainAddress } from '../addresses/ELADomainAddress';
import { Resolver } from "./Resolver";

export class ELADomainResolver extends Resolver {
    private domainSDK = null;
    private domainChain = 'elastos';
    private suffix = 'ela';

    private activeNetworkSubscription: Subscription = null;

    constructor() {
        super();

        this.activeNetworkSubscription = WalletNetworkService.instance.activeNetwork.subscribe(activeNetwork => {
            if (activeNetwork) {
                switch (activeNetwork.key) {
                    case 'fusion':
                        this.domainChain = activeNetwork.key;
                        this.suffix = 'fsn';
                    break
                    case 'iotex':
                        this.domainChain = activeNetwork.key;
                        this.suffix = 'iotx';
                    break
                    case 'fuse':
                        this.domainChain = activeNetwork.key;
                        this.suffix = 'fuse';
                    break;
                    default:
                        this.domainChain = 'elastos';
                        this.suffix = 'ela';
                    break;
                }

                this.domainSDK = null;
            }
        })
    }

    public stop() {
        if (this.activeNetworkSubscription) {
            this.activeNetworkSubscription.unsubscribe();
            this.activeNetworkSubscription = null;
        }
    }

    public getName(): string {
        return "ELADomain";
    }

    private async lazyInit() {
        if (this.domainSDK) // Already initialized
            return;

        const domainjs = (await import("domainchainjs")).default;
        this.domainSDK = domainjs.SDK(this.domainChain);
    }

    public async resolve(name: string, subWallet: AnySubWallet): Promise<Address[]> {
        await this.lazyInit();

        let addresses: Address[] = [];

        if (!name.endsWith(this.suffix)) {
            name = name + '.' + this.suffix;
        }

        Logger.log('wallet', "Searching name " + name + " on Domain Chain...");

        try {
            let result = await this.domainSDK.getOwner(name, false);
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