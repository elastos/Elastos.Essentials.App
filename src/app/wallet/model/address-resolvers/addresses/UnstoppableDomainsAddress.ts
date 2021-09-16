import { Address } from "./Address";

export class UnstoppableDomainsAddress extends Address {
    constructor(public name: string, address: string) {
        super(address);
    }

    public getDisplayName() {
        return "Unst. Domains: " + this.name;
    }
}