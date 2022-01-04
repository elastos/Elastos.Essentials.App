export enum GrabStatus {
  CAPTCHA_CHALLENGE = "captcha_challenge", // User needs to solve a captch before continuing to the last step of the grab process
  WRONG_CAPTCHA = "wrong_captcha",
  GRABBED = "grabbed", // Packet was won
  MISSED = "missed", // There were remaining packetss, but failed to win one
  DEPLETED = "depleted", // There were no more packets available
}

export type GrabResponse = {
  status: GrabStatus;
  captchaPicture?: string; // Base64 captcha challenge. Only if status is CAPTCHA_CHALLENGE
  token?: string; // Token that has to be sent back for future calls to the grab api, if a new api call is expected (ie captcha challenge)
}