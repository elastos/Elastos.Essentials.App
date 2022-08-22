import { Address } from "./Address";

export class IdrissAddress extends Address {
    public type = 'Idriss';
    constructor(public name: string, address: string, addressType: string) {
        super(address, addressType);
    }

    public getDisplayName() {
        return "IDriss: " + this.name + ' ' + this.addressType;
    }
}