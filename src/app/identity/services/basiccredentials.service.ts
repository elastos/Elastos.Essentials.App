import { Injectable } from '@angular/core';
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
      // Profile credentials
      new BasicCredentialEntry("name", "", "https://ns.elastos.org/credentials/profile/name/v1", "NameCredential"),
      new BasicCredentialEntry("avatar", { // TODO: user https://ns.elastos.org/credentials/profile/avatar/v1 with schema:avatar  - keep old fields for compatibility
        "content-type": "",
        "type": "",
        "data": ""
      }),
      new BasicCredentialEntry("email", "", "https://ns.elastos.org/credentials/profile/email/v1", "EmailCredential"),
      new BasicCredentialEntry("birthDate", ""), // TODO jingyu
      new BasicCredentialEntry("nationality", "", "did://elastos/iUq76mi2inkZfqqbHkovbcDkzEkAh2dKrb/ISONationalityCredential", "ISONationalityCredential"),
      new BasicCredentialEntry("gender", "", "https://ns.elastos.org/credentials/profile/gender/v1", "GenderCredential"),
      new BasicCredentialEntry("telephone", ""), // TODO jingyu
      new BasicCredentialEntry("nickname", ""), // TODO jingyu
      new BasicCredentialEntry("birthPlace", ""), // TODO jingyu
      new BasicCredentialEntry("occupation", ""), // TODO jingyu
      new BasicCredentialEntry("education", ""), // TODO jingyu
      new BasicCredentialEntry("interests", ""), // TODO jingyu
      new BasicCredentialEntry("description", "", "https://ns.elastos.org/credentials/profile/description/v1", "DescriptionCredential"),
      new BasicCredentialEntry("url", "", "https://ns.elastos.org/credentials/profile/url/v1", "URLCredential"),

      // Social credentials
      new BasicCredentialEntry("discord", "https://ns.elastos.org/credentials/social/discord/v1", "DiscordCredential"),
      new BasicCredentialEntry("linkedin", "", "https://ns.elastos.org/credentials/social/linkedin/v1", "LinkedinCredential"),
      new BasicCredentialEntry("facebook", "", "https://ns.elastos.org/credentials/social/facebook/v1", "FacebookCredential"),
      new BasicCredentialEntry("instagram", "", "https://ns.elastos.org/credentials/social/instagram/v1", "InstagramCredential"),
      new BasicCredentialEntry("twitter", "", "https://ns.elastos.org/credentials/social/twitter/v1", "TwitterCredential"),
      new BasicCredentialEntry("snapchat", "", "https://ns.elastos.org/credentials/social/snapchat/v1", "SnapchatCredential"),
      new BasicCredentialEntry("telegram", "", "https://ns.elastos.org/credentials/social/telegram/v1", "TelegramCredential"),
      new BasicCredentialEntry("wechat", "", "https://ns.elastos.org/credentials/social/wechat/v1", "WechatCredential"),
      new BasicCredentialEntry("weibo", "", "https://ns.elastos.org/credentials/social/weibo/v1", "WeiboCredential"),
      new BasicCredentialEntry("twitch", ""),

      // Wallet credentials
      // TODO ben:
      // - use the new wallet type
      // - Edit UI to allow choosing the address type
      // - Don't support older addresses (strings) but don't crash if receiving a string instead of an object
      new BasicCredentialEntry("elaAddress", ""/* {
        chain: "elastossmartchain",
        network:"mainnet",
        addressType:"elastosmainchain",
        address: ""
      }, "https://ns.elastos.org/credentials/wallet/v1", "WalletCredential" */),

      new BasicCredentialEntry("wallet", ""/* {
        chain: "elastossmartchain",
        network:"mainnet",
        addressType:"elastosmainchain",
        address: ""
      }*/, "https://ns.elastos.org/credentials/wallet/v1", "WalletCredential", false, true),
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
