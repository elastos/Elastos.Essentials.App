import BigNumber from "bignumber.js";

/**
 * Detailed overall costs for a packet creation.
 * Token amounts are expressed in strings because of JS number precision, for some ERC20 meme tokens...
 */
export type PacketCosts = {
  erc20Token?: { // Undefined if the packet contains native coin (no ERC20).
    redPacket: BigNumber; // Cost in token. Undefined if the packet contains no ERC20
    options: {
      publicPacketFees: BigNumber; // Number of ERC20 tokens to pay for the "public packet" option, to the Essentials team
    },
    total: BigNumber; // Sum of all above costs
  };
  nativeToken: { // Always defined, at least for gas costs
    redPacket: BigNumber; // Cost in native coin. Undefined if the packet token is a ERC20
    transactionFees: BigNumber; // Number of native tokens planned to pay for transaction fees (send each grabbed apcket + final return of remainings)
    standardServiceFeesUSD: BigNumber; // Number of USD
    standardServiceFees: BigNumber; // Number of native tokens worth of USD to pay for the red packets services, to the Essentials team
    options: {
      publicPacketFees: BigNumber; // Number of native tokens to pay for the "public packet" option, to the Essentials team
    },
    total: BigNumber; // Sum of all above costs
  }
}

/**
 * Serializable (without big numbers) version of packet costs
 * @see PacketCosts
 */
export type SerializablePacketCosts = {
  erc20Token?: {
    redPacket: string;
    options: {
      publicPacketFees: string;
    },
    total: string;
  };
  nativeToken: {
    redPacket: string;
    transactionFees: string;
    standardServiceFeesUSD: string;
    standardServiceFees: string;
    options: {
      publicPacketFees: string;
    },
    total: string;
  }
}

export const deserializeCosts = (costs: SerializablePacketCosts): PacketCosts => {
  return {
    erc20Token: costs.erc20Token ? {
      redPacket: new BigNumber(costs.erc20Token.redPacket),
      options: {
        publicPacketFees: new BigNumber(costs.erc20Token.options.publicPacketFees)
      },
      total: new BigNumber(costs.erc20Token.total)
    } : undefined,
    nativeToken: {
      redPacket: new BigNumber(costs.nativeToken.redPacket),
      transactionFees: new BigNumber(costs.nativeToken.transactionFees),
      standardServiceFeesUSD: new BigNumber(costs.nativeToken.standardServiceFeesUSD),
      standardServiceFees: new BigNumber(costs.nativeToken.standardServiceFees),
      options: {
        publicPacketFees: new BigNumber(costs.nativeToken.options.publicPacketFees)
      },
      total: new BigNumber(costs.nativeToken.total)
    }
  }
}