import { Address } from "./Address";

export class CryptoNameAddress extends Address {
    constructor(public name: string, address: string) {
        super(address);
    }

    public getDisplayName() {
        return "CryptoName: "+this.name;
    }
}