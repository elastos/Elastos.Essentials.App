// import type { ENS } from '@ensdomains/ensjs';
import { lazyEthersImport } from 'src/app/helpers/import.helper';
import { Logger } from "src/app/logger";
import { AnySubWallet } from '../../networks/base/subwallets/subwallet';
import { EthereumAPI, EthereumAPIType } from '../../networks/ethereum/network/ethereum.api';
import { WalletUtil } from '../../wallet.util';
import { Address } from '../addresses/Address';
import { ENSAddress } from '../addresses/ENSAddress';
import { Resolver } from "./Resolver";

export class ENSResolver extends Resolver {
    // private ENSInstance: ENS = null;

    // TODO : build error (HookWebpackError: Cannot read properties of undefined) with @ensdomains/ensjs": "3.0.0-alpha.20"
    // Temporarily remove ENSResolver, Try to upgrade @ensdomains/ensjs later
    private ENSInstance = null;

    constructor() {
        super();
    }

    public stop() {}

    private async lazyInitENS() {
        if (this.ENSInstance)
            return;

        const { providers } = await lazyEthersImport();

        // ENS is deployed on the Ethereum main network and on several test networks.
        let providerUrl = EthereumAPI.getApiUrl(EthereumAPIType.RPC, 'mainnet');
        const provider = new providers.JsonRpcProvider(providerUrl)

        // const ENS = (await import('@ensdomains/ensjs')).ENS;
        // this.ENSInstance = new ENS()
        // try {
        //     await this.ENSInstance.setProvider(provider)
        // } catch (e) {
        //     Logger.warn('wallet', ' ENSInstance.setProvider error', e)
        // }
    }

    public getName(): string {
        return "ENS";
    }

    public async resolve(name: string, subWallet: AnySubWallet): Promise<Address[]> {
        let addresses: Address[] = [];

        Logger.log('wallet', "Searching name " + name + " on ENS...");

        await this.lazyInitENS();

        try {
            let result = await this.ENSInstance.getProfile(name, {
                texts: false,
                coinTypes: true,
                contentHash: false,
            })
            if (result && result.records && result.records.coinTypes) {
                for (var index in result.records.coinTypes) {
                    let coinType = result.records.coinTypes[index];
                    let address = (coinType as any).addr;
                    if (coinType.type === 'addr' && address && (await this.isAddressValid(subWallet, address))) {
                        addresses.push(new ENSAddress(name, address, coinType.coin));
                    }
                }
            }
        }
        catch (err) {
            // Name not found will throw an error, so we just return nothing.
        }

        return addresses;
    }

    private async isAddressValid(subWallet: AnySubWallet, address: string) {
        if (subWallet) {
            return await subWallet.isAddressValid(address);
        } else {
            // Multi-sign wallet transfer to ESC or EID.
            return WalletUtil.isEVMAddress(address);
        }
    }
}