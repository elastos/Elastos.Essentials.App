import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { BasicCredentialEntry } from '../model/basiccredentialentry.model';

@Injectable({
  providedIn: 'root'
})
export class BasicCredentialsService {
  public static instance: BasicCredentialsService = null;

  private basicCredentialEntryList: BasicCredentialEntry[];

  constructor() {
    BasicCredentialsService.instance = this;

    this.createBasicCredentialInfoList();
  }

  private createBasicCredentialInfoList() {
    this.basicCredentialEntryList = [
      new BasicCredentialEntry("name", ""),
      new BasicCredentialEntry("avatar", {
        "content-type": "",
        "type": "",
        "data": ""
      }),
      new BasicCredentialEntry("email", ""),
      new BasicCredentialEntry("birthDate", ""),
      new BasicCredentialEntry("nation", ""),
      new BasicCredentialEntry("gender", ""),
      new BasicCredentialEntry("telephone", ""),
      new BasicCredentialEntry("nickname", ""),
      new BasicCredentialEntry("birthPlace", ""),
      new BasicCredentialEntry("occupation", ""),
      new BasicCredentialEntry("education", ""),
      new BasicCredentialEntry("interests", ""),
      new BasicCredentialEntry("description", ""),
      new BasicCredentialEntry("url", ""),
      new BasicCredentialEntry("facebook", ""),
      new BasicCredentialEntry("instagram", ""),
      new BasicCredentialEntry("twitter", ""),
      new BasicCredentialEntry("snapchat", ""),
      new BasicCredentialEntry("telegram", ""),
      new BasicCredentialEntry("wechat", ""),
      new BasicCredentialEntry("weibo", ""),
      new BasicCredentialEntry("twitch", ""),
      new BasicCredentialEntry("elaAddress", ""),
      // new BasicCredentialEntry("tiktok", ""),
      // new BasicCredentialEntry("paypal", ""),
      // new BasicCredentialEntry("venmo", ""),
    ];
  }

  /**
   * Returns a list of standard profile entries that we can let user add to his profile.
   * Each profile item has its own type (text, date, number...) and the UI will provide a different
   * input method according to this type.
   *
   * Type names follow the Elastos DID standard defined by the Elastos DID specification.
   */
  getBasicCredentialEntryList(): BasicCredentialEntry[] {
    return this.basicCredentialEntryList;
  }

  getBasicCredentialkeys(): string[] {
    let keys = this.basicCredentialEntryList.map(i => (i.key));

    return keys;
  }

  getBasicCredentialInfoByKey(key: string): BasicCredentialEntry {
    let info = this.basicCredentialEntryList.find((i) => {
      return i.key == key;
    });
    return info;
  }
}
