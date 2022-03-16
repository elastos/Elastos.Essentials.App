import BigNumber from "bignumber.js";

/**
 * Detailed overall costs for a packet creation.
 * Token amounts are expressed in strings because of JS number precision or for some ERC20 meme tokens...
 * Token amounts are in human readable format, NOT in wei/token decimals.
 */
export type PacketCosts = {
  erc20Token?: { // Undefined if the packet contains native coin (no ERC20).
    redPacket: BigNumber; // Cost in token. Undefined if the packet contains no ERC20
    options: {
      publicPacketFeesTokenPercent?: BigNumber;
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
      publicPacketFeesTokenPercent?: BigNumber;
      publicPacketFeesUSD: BigNumber;
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
      publicPacketFeesTokenPercent?: string;
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
      publicPacketFeesTokenPercent?: string;
      publicPacketFeesUSD: string;
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
        publicPacketFeesTokenPercent: costs.erc20Token.options.publicPacketFeesTokenPercent ? new BigNumber(costs.erc20Token.options.publicPacketFeesTokenPercent) : undefined,
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
        publicPacketFeesTokenPercent: costs.nativeToken.options.publicPacketFeesTokenPercent ? new BigNumber(costs.nativeToken.options.publicPacketFeesTokenPercent) : undefined,
        publicPacketFeesUSD: new BigNumber(costs.nativeToken.options.publicPacketFeesUSD),
        publicPacketFees: new BigNumber(costs.nativeToken.options.publicPacketFees)
      },
      total: new BigNumber(costs.nativeToken.total)
    }
  }
}

export const serializeCosts = (costs: PacketCosts): SerializablePacketCosts => {
  return {
    erc20Token: costs.erc20Token ? {
      redPacket: costs.erc20Token.redPacket.toFixed(),
      options: {
        publicPacketFeesTokenPercent: costs.erc20Token.options.publicPacketFeesTokenPercent ? costs.erc20Token.options.publicPacketFeesTokenPercent.toFixed() : undefined,
        publicPacketFees: costs.erc20Token.options.publicPacketFees.toFixed()
      },
      total: costs.erc20Token.total.toFixed()
    } : undefined,
    nativeToken: {
      redPacket: costs.nativeToken.redPacket.toFixed(),
      transactionFees: costs.nativeToken.transactionFees.toFixed(),
      standardServiceFeesUSD: costs.nativeToken.standardServiceFeesUSD.toFixed(),
      standardServiceFees: costs.nativeToken.standardServiceFees.toFixed(),
      options: {
        publicPacketFeesTokenPercent: costs.nativeToken.options.publicPacketFeesTokenPercent ? costs.nativeToken.options.publicPacketFeesTokenPercent.toFixed() : undefined,
        publicPacketFeesUSD: costs.nativeToken.options.publicPacketFeesUSD.toFixed(),
        publicPacketFees: costs.nativeToken.options.publicPacketFees.toFixed()
      },
      total: costs.nativeToken.total.toFixed()
    }
  }
}