export enum BasicCredentialInfoType {
    TEXT,
    IMAGE,
    DATE,
    NUMERIC,
    PHONE_NUMBER,
    EMAIL,
    COUNTRY,
    GENDER
}

export class BasicCredentialInfo {
    constructor(public key: string, public type: BasicCredentialInfoType) {}

    public isText(): boolean {
        return this.type == BasicCredentialInfoType.TEXT;
    }

    public isImage(): boolean {
      return this.type == BasicCredentialInfoType.IMAGE;
  }

    public isNumeric(): boolean {
        return this.type == BasicCredentialInfoType.NUMERIC;
    }

    public isEmail(): boolean {
        return this.type == BasicCredentialInfoType.EMAIL;
    }

    public isPhoneNumber(): boolean {
        return this.type == BasicCredentialInfoType.PHONE_NUMBER;
    }

    public isDate(): boolean {
        return this.type == BasicCredentialInfoType.DATE;
    }

    public isCountry(): boolean {
        return this.type == BasicCredentialInfoType.COUNTRY;
    }

    public isGender(): boolean {
        return this.type == BasicCredentialInfoType.GENDER;
    }
}
