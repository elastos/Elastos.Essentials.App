
export const AESEncrypt = async (content, password): Promise<string> => {
  const encrypt = (await import("crypto-js/aes")).encrypt;
  return encrypt(JSON.stringify({ content }), password).toString();
}

export const AESDecrypt = async (crypted, password): Promise<string> => {
  const enc = (await import("crypto-js")).enc;
  const decrypt = (await import("crypto-js/aes")).decrypt;
  return JSON.parse(decrypt(crypted, password).toString(enc.Utf8)).content;
}
