import BigNumber from "bignumber.js";
import moment from "moment";
import { TranslationService } from "src/app/identity/services/translation.service";
import { deserializeCosts, PacketCosts, SerializablePacketCosts, serializeCosts } from "./packetcosts.model";
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

export type PacketToCreate = {
  packetType: PacketType;
  quantity: number; // Mandatory - number of red packets
  chainId?: number; // Chain ID (for EVM network - the only kind of network supported now)
  tokenType: TokenType; // Native or ERC20 token in packets?
  erc20ContractAddress?: string; // Address of the ERC20 token, if the red packet contains ERC20 tokens on an EVM chain
  value: BigNumber; // Number of tokens to spend (native, or ERC20) - human readable
  distributionType: PacketDistributionType;
  message: string;
  category?: string; // Optional red packet theme. Christmas, etc. "default" by default, meaning no special theme
  visibility?: PacketVisibility; // Optional visibility. Link only by default
  probability?: number; // 0-100 probability to win a red packet.
  creatorAddress: string; // Creator's wallet address (EVM 0x address)
  creatorDID: string; // Creator's DID string
  expirationDate: number; // Unix timestamp at which the red packet will expire
}

export class SerializedPacket {
  packetType: PacketType;
  quantity: number; // Mandatory - number of red packets
  chainId?: number; // Chain ID (for EVM network - the only kind of network supported now)
  tokenType: TokenType; // Native or ERC20 token in packets?
  erc20ContractAddress?: string; // Address of the ERC20 token, if the red packet contains ERC20 tokens on an EVM chain
  value: BigNumber; // Number of tokens to spend (native, or ERC20) - human readable
  distributionType: PacketDistributionType;
  message: string;
  category?: string; // Optional red packet theme. Christmas, etc. "default" by default, meaning no special theme
  visibility?: PacketVisibility; // Optional visibility. Link only by default
  probability?: number; // 0-100 probability to win a red packet.
  creatorAddress: string; // Creator's wallet address (EVM 0x address)
  creatorDID: string; // Creator's DID string
  expirationDate: number; // Unix timestamp at which the red packet will expire

  hash?: string; // Unique packet hash just created
  creationDate: number; // Timestamp
  nativeTokenSymbol: string; // ie "ELA" - computed by the service, not by clients
  erc20TokenSymbol: string;  // ie "GOLD" - computed by the service, not by clients
  costs: SerializablePacketCosts;
  paymentAddress?: string; // EVM address of this service, where payments have to be sent
  paymentStatus?: PaymentStatus;
}

// With methods
export class Packet {
  packetType: PacketType;
  quantity: number; // Mandatory - number of red packets
  chainId?: number; // Chain ID (for EVM network - the only kind of network supported now)
  tokenType: TokenType; // Native or ERC20 token in packets?
  erc20ContractAddress?: string; // Address of the ERC20 token, if the red packet contains ERC20 tokens on an EVM chain
  value: BigNumber; // Number of tokens to spend (native, or ERC20) - human readable
  distributionType: PacketDistributionType;
  message: string;
  category?: string; // Optional red packet theme. Christmas, etc. "default" by default, meaning no special theme
  visibility?: PacketVisibility; // Optional visibility. Link only by default
  probability?: number; // 0-100 probability to win a red packet.
  creatorAddress: string; // Creator's wallet address (EVM 0x address)
  creatorDID: string; // Creator's DID string
  expirationDate: number; // Unix timestamp at which the red packet will expire

  hash?: string; // Unique packet hash just created
  creationDate: number; // Timestamp
  nativeTokenSymbol: string; // ie "ELA" - computed by the service, not by clients
  erc20TokenSymbol: string;  // ie "GOLD" - computed by the service, not by clients
  costs: PacketCosts;
  paymentAddress?: string; // EVM address of this service, where payments have to be sent
  paymentStatus?: PaymentStatus;
  isActive: boolean; // Whether the packet is ready for others to grab - ie, it has been paid by the creator

  public static fromSerializedPacket(serializedPacket: SerializedPacket): Packet {
    let packet = new Packet();
    Object.assign(packet, serializedPacket);

    packet.costs = deserializeCosts(serializedPacket.costs);

    return packet;
  }

  public serialize(): SerializedPacket {
    let serializedPacket = new SerializedPacket();
    Object.assign(serializedPacket, this);

    serializedPacket.costs = serializeCosts(this.costs);

    return serializedPacket;
  }

  public isNativePaymentCompleted(): boolean {
    return !!this.paymentStatus.nativeToken;
  }

  public isERC20PaymentCompleted(): boolean {
    return !!this.paymentStatus.erc20Token;
  }

  public areAllPaymentsCompleted(): boolean {
    if (this.tokenType === TokenType.NATIVE_TOKEN)
      return this.isNativePaymentCompleted();
    else
      return this.isNativePaymentCompleted() && this.isERC20PaymentCompleted();
  }

  /**
   * Tells if the packet was created by the given did
   */
  public userIsCreator(did: string): boolean {
    return this.creatorDID === did;
  }

  public isExpired(): boolean {
    return this.expirationDate < Date.now() / 1000;
  }

  /**
   * Returns a user friendly string showing the time left before the packet expires. eg:
   * - X days left
   * - X hours left
   * - A few minutes left
   * - Expired
   */
  public getDisplayableTimeLeft(): string {
    let now = moment();
    let expiration = moment.unix(this.expirationDate);

    if (now.isAfter(expiration))
      return TranslationService.instance.translateInstant("redpackets.expired");
    else if (expiration.diff(now, "minutes") < 60)
      return TranslationService.instance.translateInstant("redpackets.few-minutes-left");
    else if (expiration.diff(now, "hours") < 24)
      return TranslationService.instance.translateInstant("redpackets.n-hours-left", { hours: Math.floor(expiration.diff(now, "hours")) });
    else
      return TranslationService.instance.translateInstant("redpackets.n-days-left", { days: Math.floor(expiration.diff(now, "days")) });
  }
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
