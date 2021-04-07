export abstract class Address {
    constructor(public address: string) {}

    /**
     * Returns a displayable string that represents this resolved entity.
     * Ex: "Rong"
     */
    public abstract getDisplayName();
}
