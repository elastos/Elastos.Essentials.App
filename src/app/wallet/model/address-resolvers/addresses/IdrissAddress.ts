import { Address } from "./Address";

export class IdrissAddress extends Address {
    constructor(public name: string, address: string) {
        super(address);
    }

    public getDisplayName() {
        return "Idriss: "+this.name;
    }
}