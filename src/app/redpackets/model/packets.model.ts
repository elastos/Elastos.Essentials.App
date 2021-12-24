import BigNumber from "bignumber.js";
import { PacketCosts, SerializablePacketCosts } from "./packetcosts.model";
import { PaymentStatus } from "./payments.model";

export enum PacketType {
  STANDARD = "standard",
  NFT = "nft" // Packet contains NFTs. For future use.
}

export enum TokenType {
  NATIVE_TOKEN = "native", // Use the native chain coin. ie ELA on the Elastos smart chain
  ERC20_TOKEN = "erc20" // Use a ERC20 token
}

export enum PacketDistributionType {
  FIXED = "fixed", // Same number of tokens in each packet
  RANDOM = "random" // Random amount of tokens in each packet
}

export enum PacketVisibility {
  LINK_ONLY = "link", // Only users with the link can find the red packet
  PUBLIC = "public" // Red packet is publicly visible
}

export class Packet {
  public packetType: PacketType;
  public quantity: number; // Mandatory - number of red packets
  public chainId?: number; // Chain ID (for EVM network - the only kind of network supported now)
  public tokenType: TokenType; // Native or ERC20 token in packets?
  public erc20ContractAddress?: string; // Address of the ERC20 token, if the red packet contains ERC20 tokens on an EVM chain
  public value: BigNumber; // Number of tokens to spend (native, or ERC20) - human readable
  public distributionType: PacketDistributionType;
  public message: string;
  public category?: string; // Optional red packet theme. Christmas, etc. "default" by default, meaning no special theme
  public visibility?: PacketVisibility; // Optional visibility. Link only by default
  public probability?: number; // 0-100 probability to win a red packet.
  public creatorAddress: string; // Creator's wallet address (EVM 0x address)
  public creatorDID: string; // Creator's DID string
  public expirationDate: number; // Unix timestamp at which the red packet will expire

  // Payments
  paymentAddress?: string; // EVM address of this service, where payments have to be sent
  paymentStatus?: PaymentStatus;
}

// TODO: delete
export class PacketDetail {
  constructor(
    public language: string,
    public packet_amt: string,
    public packet_blessing: string,
    public packet_creator: string,
    public packet_end_timestamp: any,
    public packet_num: number,
    public packet_rcv_amt: number,
    public packet_rcv_num: number,
    public packet_rcver_details: any[],
    public packet_start_timestamp: any,
    public packet_type: number
  ) { }
}

/**
 * Packet info returned by the api after a packet creation
 */
export type CreatedPacket<T extends PacketCosts | SerializablePacketCosts> = {
  request: Packet; // Original request - not used for now
  hash: string; // Unique packet hash just created
  paymentAddress: string; // EVM address of this service, where payments have to be sent
  costs: T; // Costs associated to this packet creation, for the creator
}