import { Address } from "./Address";

export class UnstoppableDomainsAddress extends Address {
    public type = 'UnstoppableDomains';
    constructor(public name: string, address: string, addressType: string) {
        super(address, addressType);
    }

    public getDisplayName() {
        return "Unst. Domains: " + this.name + ' ' + this.addressType;
    }
}