import { BasicCredentialEntry } from "./basiccredentialentry.model";

/**
 * High level representation of the local DID document for convenience while displaying data on UI.
 *
 * Fields in this class match the Elastos DID specification naming convention for credentials.
 */
export class Profile {
  public entries: BasicCredentialEntry[] = [];

  constructor() { }

  getEntryByKey(key: string) {
    return this.entries.find((e) => {
      return e.key === key;
    });
  }

  setValue(basiccredentialentry: BasicCredentialEntry, value: string, isVisible: boolean) {
    // If the entry already exists, we just update it. Otherwise we add it first.
    let entry = this.getEntryByKey(basiccredentialentry.key);
    if (!entry) {
      entry = new BasicCredentialEntry(basiccredentialentry.key, value, isVisible);
      this.entries.push(entry);
    } else {
      entry.value = value;
    }
  }

  deleteEntry(entry: BasicCredentialEntry) {
    let deletionIndex = this.entries.findIndex((e) => {
      return e.key == entry.key;
    });
    if (deletionIndex >= 0) {
      this.entries.splice(deletionIndex, 1);
    }
  }

  getName(): string {
    let nameEntry = this.getEntryByKey("name");
    if (!nameEntry) return null;

    return nameEntry.value;
  }

  getDescription(): string {
    let descriptionEntry = this.getEntryByKey("description");
    if (!descriptionEntry) return null;

    return descriptionEntry.value;
  }

  static createDefaultProfile(): Profile {
    let profile = new Profile();

    // Displayable Header Entries
    profile.entries.push(new BasicCredentialEntry("name", ""));
    profile.entries.push(new BasicCredentialEntry("avatar", null));
    profile.entries.push(new BasicCredentialEntry("description", ""));
    // Other Essential Entries
    profile.entries.push(new BasicCredentialEntry("birthDate", ""));
    profile.entries.push(new BasicCredentialEntry("nation", ""));
    profile.entries.push(new BasicCredentialEntry("email", ""));
    profile.entries.push(new BasicCredentialEntry("gender", ""));
    profile.entries.push(new BasicCredentialEntry("telephone", ""));


    return profile;
  }

  static fromProfile(profile: Profile) {
    let newProfile = new Profile();
    Object.assign(newProfile, profile);
    return newProfile;
  }



  isMale() {
    let genderEntry = this.getEntryByKey("gender");
    return (
      !genderEntry || genderEntry.value == "" || genderEntry.value == "male"
    );
  }

  getDefaultProfilePicturePath() {
    if (this.isMale()) return "assets/identity/images/Guy_Face.svg";
    else return "assets/identity/images/DefaultProfileWoman.svg";
  }
}
