/**
 * Detailed overall costs for a packet creation.
 * Token amounts are expressed in strings because of JS number precision, for some ERC20 mem tokens...
 */
export type PacketCosts = {
  erc202Token: { // Undefined if the packet contains native coin (no ERC20).
    redPacket: string; // Cost in token. Undefined if the packet contains no ERC20
    options: {
      publicPacketFees: string; // Number of ERC20 tokens to pay for the "public packet" option, to the Essentials team
    }
  };
  nativeToken: { // Always defined, at least for gas costs
    redPacket: string; // Cost in native coin. Undefined if the packet token is a ERC20
    transactionFees: string; // Number of native tokens planned to pay for transaction fees (send each grabbed apcket + final return of remainings)
    standardServiceFees: string; // Number of native tokens worth of USD to pay for the red packets services, to the Essentials team
    options: {
      publicPacketFees: string; // Number of native tokens to pay for the "public packet" option, to the Essentials team
    }
  }
}
