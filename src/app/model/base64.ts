
export class BASE64 {
    public static fromString(value: string): string{
        let base64string = Buffer.from(value, "utf-8").toString("base64");
        return  this.convertToURI(base64string)
    }

    public static fromHex(hexString: string): string{
       return this.encode(hexString)
    }

    public static fromUrlFormat(b64uString: string): string{
        return this.convertFromURI(b64uString)
    }

    public static toUrlFormat(b64String: string): string{
        return this.convertToURI(b64String)
    }

    public static toHex(b64String: string): string{
        return this.decode(b64String)
    }

    public static toString(b64String: string): string{
        let b64str = b64String
        if (!b64str.endsWith("=")) b64str = this.convertFromURI(b64str)
        return Buffer.from(b64str, "base64").toString("utf-8")
    }

    // TODO: Should clean up the above mess conversion methods.

    // All base64 contents inside the DID objects are base64 URL safe mode.
    // Decode the base64 URL safe input into the string encoded in hex.
    public static decode(b64uString: string): string {
        let b64str = b64uString
        if (!b64str.endsWith("=")) b64str = this.convertFromURI(b64str)
        return Buffer.from(b64str, "base64").toString("hex");
    }

    public static encode(hexToBase64: string): string{
        let b64str = Buffer.from(hexToBase64, "hex").toString("base64");
        return  this.convertToURI(b64str)
    }

    private static convertToURI(b64str: string) : string{
        return b64str.replace(/[+/]/g, (item) => item == '+' ? '-' : '_').replace(/=+$/m, '');
    }

    private static convertFromURI(b64ustr: string) : string{
        return b64ustr.replace(/[-_]/g, (item) => item == '-' ? '+' : '/') + '='
    }
}