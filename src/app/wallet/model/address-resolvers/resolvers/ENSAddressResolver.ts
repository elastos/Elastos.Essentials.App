import { ENS } from '@ensdomains/ensjs';
import { ethers } from 'ethers';
import { Logger } from "src/app/logger";
import { AnySubWallet } from '../../networks/base/subwallets/subwallet';
import { EthereumAPI, EthereumAPIType } from '../../networks/ethereum/network/ethereum.api';
import { Address } from '../addresses/Address';
import { CryptoNameAddress } from '../addresses/CryptoNameAddress';
import { Resolver } from "./Resolver";

export class ENSResolver extends Resolver {
    private ENSInstance: ENS = null;

    constructor() {
        super();
        void this.initENS();
    }

    private async initENS() {
        // ENS is deployed on the Ethereum main network and on several test networks.
        let providerUrl = EthereumAPI.getApiUrl(EthereumAPIType.RPC, 'mainnet');
        const provider = new ethers.providers.JsonRpcProvider(providerUrl)

        this.ENSInstance = new ENS()
        try {
            await this.ENSInstance.setProvider(provider)
        } catch (e) {
            Logger.warn('wallet', ' ENSInstance.setProvider error', e)
        }
    }

    public getName(): string {
        return "ENS";
    }

    public async resolve(name: string, subWallet: AnySubWallet): Promise<Address[]> {
        let addresses: Address[] = [];

        Logger.log('wallet', "Searching name " + name + " on ENS...");

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
                    if (coinType.type === 'addr' && address && (!subWallet || await subWallet.isAddressValid(address))) {
                        addresses.push(new CryptoNameAddress(name, address, coinType.coin));
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