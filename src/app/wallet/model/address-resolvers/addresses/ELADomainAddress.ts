import { Address } from "./Address";

export class ELADomainAddress extends Address {
    public type = 'ELADomain';
    constructor(public name: string, address: string, public addressType: string) {
        super(address, addressType);
    }

    public getDisplayName() {
        return "ELADomain: " + this.name + ' ' + this.addressType;
    }
}