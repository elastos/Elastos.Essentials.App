import { Avatar } from "./avatar";

export class CredentialProfile {
  constructor(
    // Basic Credentials
    public name: string,
    public gender: string,
    public nickname: string,
    public nation: string,
    public birthDate: string,
    public birthPlace: string,

    // Detailed Credentials
    public occupation: string,
    public education: string,
    public telephone: string,
    public email: string,
    public interests: string,
    public description: string,
    public url: string,

    // Social Media Credentials
    public twitter: string,
    public facebook: string,
    public instagram: string,
    public snapchat: string,
    public telegram: string,
    public wechat: string,
    public weibo: string,
    public twitch: string,

    // Wallet Credentials
    public elaAddress: string,

    // Avatar Credentials
    public avatar: Avatar,
  ) {}
}
