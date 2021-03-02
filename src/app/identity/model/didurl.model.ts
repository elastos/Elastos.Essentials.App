/**
 * Because DID SDK implementation is tricky using long and short DIDURL forms, and as we cannot rely
 * on typescript to check various "string" content, we create a cocooning class to take care of a few
 * DIDURL operations while verifying formats and providing shortcut methods.
 */
export class DIDURL {
    /**
     * @param didUrlString did:elastos:abdef#key or #Key
     */
    constructor(private didUrlString: string) {
        if (!didUrlString) 
            throw new Error("DID URL cannot be undefined!");

        if (!this.hasRightFormat())
            throw new Error("Invalid DIDURL format: "+didUrlString);
    }

    private hasRightFormat(): boolean {
        // Ok if starts with #
        if (this.didUrlString.indexOf("#") == 0)
            return true;

        // Ok if can be parsed as an URI with a fragment
        let url = new URL(this.didUrlString);
        if (url == null || url.hash == null || url.hash == "")
            return false;

        return true;
    }

    /**
     * Converts did:elastos:abced#key into #key
     */
    public shortForm() {
        // return didUrlString if starts with #
        if (this.didUrlString.indexOf("#") == 0)
            return this.didUrlString;

        return new URL(this.didUrlString).hash;
    }

    public getFragment(): string {
        return this.shortForm().substr(1);
    }

    public matches(didUrlString: string): boolean {
        let comparedDidUrl = new DIDURL(didUrlString);
        return comparedDidUrl.shortForm() == this.shortForm();
    }

    public toString(): string {
        return this.didUrlString;
    }
}