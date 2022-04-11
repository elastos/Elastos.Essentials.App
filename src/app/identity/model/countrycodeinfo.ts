export class CountryCodeInfo {
    constructor(
        public name: string,
        public alpha3: string, // ISO 3166-1 alpha-3 - https://countrycode.org/
        public countryCode: string
    ) { }
}
