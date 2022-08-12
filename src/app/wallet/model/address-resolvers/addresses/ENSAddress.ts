import { Address } from "./Address";

export class ENSAddress extends Address {
    public type = 'ENS';
    constructor(public name: string, address: string, public addressType: string) {
        super(address, addressType);
    }

    public getDisplayName() {
        return "ENS: " + this.name + ' ' + this.addressType;
    }
}