import { Util } from "src/app/model/util";
import { AnySubWallet } from '../../networks/base/subwallets/subwallet';
import { Address } from '../addresses/Address';
import { IdrissAddress } from "../addresses/IdrissAddress";
import { Resolver } from "./Resolver";

export class IdrissResolver extends Resolver {
    constructor() {
        super();
    }

    public stop() {}

    public getName(): string {
        return "Idriss";
    }

    // name: Case sensitive
    public async resolve(name: string, subWallet: AnySubWallet): Promise<Address[]> {
        let addresses: Address[] = [];

        name = name.trim().replace(' ', ''); // Remove spaces before name and secret

        if (!this.isInputValid(name)) {
            return [];
        }

        try {
            const IdrissCrypto = (await import("idriss-crypto/lib/browser")).IdrissCrypto;
            const idriss = new IdrissCrypto();
            const result = await idriss.resolve(name);

            if (result) {
                for (var index in result) {
                    if (!subWallet || await subWallet.isAddressValid(result[index])) {
                        addresses.push(new IdrissAddress(name, result[index], index));
                    }
                }
            }
        }
        catch (err) {
            // Logger.warn('wallet', ' IdrissCrypto error:', err)
        }

        return addresses;
    }

    // input:[phone, email] + [secret]
    private isInputValid(input: string): boolean {
        let phonenumber = Util.startwithphonenumber(input);
        if (phonenumber) return true;

        let email = Util.email(input);
        if (email) return true;

        let isTwitter = input.startsWith('@');
        return isTwitter
    }
}