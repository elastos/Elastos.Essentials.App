import { BasicCredentialInfo, BasicCredentialInfoType } from "./basiccredentialinfo.model";
import { area } from '../../../assets/identity/area/area';
import { CountryCodeInfo } from "./countrycodeinfo";
import { TranslationService } from "../services/translation.service";

export class BasicCredentialEntry {
  constructor(
    public key: string, // Related key in basic credential keys ("name", "avatar"...)
    public value: any, // Credentials will mostly be strings, sometimes more complex objects
    public isVisible: boolean = false // Convenient way to toggle profile credentials visibility from the UI
  ) {}

  /**
   * Returns a displayable string that shows this entry content. For now we put all types in this class, we
   * don't want to build one class per credential type.
   */
  toDisplayString() {
    switch (this.key) {
      case 'nation':
        return this.getDisplayableNation();
      case 'birthDate':
        return this.getDisplayableDate();
      case 'gender':
        return this.getDisplayableGender();
      default:
        return this.value;
    }
  }

  private getDisplayableNation(): string {
    let countryInfo = area.find((a: CountryCodeInfo) => {
      return this.value == a.alpha3;
    });

    if (!countryInfo)
      return null;

    return countryInfo.name;
  }

  private getDisplayableDate(): string {
    if (!this.value || this.value == "")
      return null;

    let d = new Date(this.value);
    return d.toLocaleDateString();
  }

  private getDisplayableGender(): string {
    if (!this.value || this.value == "")
      return null;

    return TranslationService.instance.translateInstant(this.value);
  }
}
