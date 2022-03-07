import { enc } from "crypto-js";
import { decrypt, encrypt } from "crypto-js/aes";

export const AESEncrypt = (content, password) => encrypt(JSON.stringify({ content }), password).toString();
export const AESDecrypt = (crypted, password) => JSON.parse(decrypt(crypted, password).toString(enc.Utf8)).content;
