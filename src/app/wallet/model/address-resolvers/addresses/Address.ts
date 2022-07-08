export abstract class Address {
    constructor(public address: string, public addressType) {}

    /**
     * Returns a displayable string that represents this resolved entity.
     * Ex: "Rong"
     */
    public abstract getDisplayName();
}
