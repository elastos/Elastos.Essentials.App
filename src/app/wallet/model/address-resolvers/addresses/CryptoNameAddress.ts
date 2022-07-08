import { Address } from "./Address";

export class CryptoNameAddress extends Address {
    public type = 'CryptoName';
    constructor(public name: string, address: string, public addressType: string) {
        super(address, addressType);
    }

    public getDisplayName() {
        return "CryptoName: " + this.name + ' ' + this.addressType;
    }
}