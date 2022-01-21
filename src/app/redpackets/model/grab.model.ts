import { SerializedPacket } from "./packets.model"

export enum GrabStatus {
  CAPTCHA_CHALLENGE = "captcha_challenge", // User needs to solve a captch before continuing to the last step of the grab process
  WRONG_CAPTCHA = "wrong_captcha",
  GRABBED = "grabbed", // Packet was won
  MISSED = "missed", // There were remaining packetss, but failed to win one
  DEPLETED = "depleted", // There were no more packets available
  TOO_MANY_REQUEST = "too_many_request" // 429 HTTP error converted to a client side GrabStatus
}

export type GrabRequest = {
  token?: string; // If the request is a follow up to an initial request, the continuation token must be passed here
  captchaResponse?: string; // If the request is a response to the captcha challenge, user's captcha response must be passed here
  walletAddress: string; // EVM address string of the calling user
  userDID?: string; // Optional DID of the grabber, used for display purpose (ie list of winners)
}

export type GrabResponse = {
  status: GrabStatus;
  captchaPicture?: string; // Base64 captcha challenge. Only if status is CAPTCHA_CHALLENGE
  token?: string; // Token that has to be sent back for future calls to the grab api, if a new api call is expected (ie captcha challenge)
  earnedAmount?: string; // Human readable number of tokens earned, if the grab is a win (ie "2.5" for 2.5 ELA)
}

/**
 * Information about the winner of a packet
 */
export type PacketWinner = {
  creationDate: number; // Timestamp
  userDID?: string;
  winningAmount?: string; // Number of tokens earned. Human readable
  walletAddress: string;
}

/**
 * Grabbed packet information stored locally
 */
export type GrabbedPacket = {
  packet: SerializedPacket;
  status: GrabStatus; // won, lost...
  earnedAmount?: string;
}