import { Util } from "src/app/model/util";
import { JsonObject, JsonProperty } from "typescript-json-serializer";
import { erc20CoinsSerializer } from "../services/evm/erc20coin.service";
import { AnyNetwork } from "./networks/network";

export type CoinID = string; // ELA, IDChain, ERC1, ERC2...

export enum CoinType {
    STANDARD = "STANDARD", // For ELA, IDChain, ETHSC
    ERC20 = "ERC20", // For ERC20 tokens
    TRC20 = "TRC20", // For TRC20 tokens
}

export enum StandardCoinName {
    ELA = 'ELA',
    ETHSC = 'ETHSC',
    ETHDID = 'ETHDID',
    BTC = 'BTC',
    TRON = 'TRON'
}

export namespace StandardCoinName {
    export function fromCoinID(coinID: CoinID): StandardCoinName {
        return StandardCoinName[coinID];
    }
}

export type TokenAddress = string; // EVM address of the token contract
export enum TokenType {
    ERC_20 = "ERC-20",
    ERC_721 = "ERC-721",
    ERC_1155 = "ERC-1155"
}

@JsonObject()
export class Coin {
    @JsonProperty() private type: CoinType;
    @JsonProperty() private id: CoinID;
    @JsonProperty() private name: string; // Symbol
    @JsonProperty() private description: string;
    @JsonProperty() private removable: boolean; // Whether this coin is removable from the coins list manager or not.
    @JsonProperty() public timestamp = 0;

    constructor(
        public network: AnyNetwork,
        type: CoinType,
        id: CoinID,
        name: string,
        description: string,
        removable: boolean, // Whether this coin is removable from the coins list manager or not.
        timestamp = 0 // 0: builtin coin
    ) {
        // JSON serializer cannot work with decorators in constructor (runtime JS undefined errors)
        this.type = type;
        this.id = id;
        this.name = name;
        this.description = description;
        this.removable = removable;
        this.timestamp = timestamp;
    }

    public getType(): CoinType {
        return this.type;
    }

    public getID(): CoinID {
        return this.id;
    }

    public getSymbol(): string {
        return this.name; // get symbol returns name... legacy.
    }

    public getDescription(): string {
        return this.description;
    }

    public canBeRemoved(): boolean {
        return this.removable;
    }

    public getCreatedTime(): number {
        return this.timestamp;
    }

    public equals(coin: Coin): boolean {
        return !!coin && this.id === coin.id && this.network.equals(coin.network);
    }

    /**
     * Unique string representing this coin over all coins on all networks and network templates.
     */
    public key(): string {
        return this.network.key + this.network.networkTemplate + this.id;
    }
}

/**
 * These are the coins used to pay for GAS. One per network.
 */
export class NativeCoin extends Coin {
    constructor(network: AnyNetwork, id: CoinID, name: string, description: string) {
        super(network, CoinType.STANDARD, id, name, description, false);
    }
}

/**
 * ERC20 tokens, for EVM networks.
 */
@JsonObject()
export class ERC20Coin extends Coin {
    @JsonProperty() public erc20ContractAddress: string;
    @JsonProperty() public decimals: number;
    @JsonProperty() private isCustom: boolean;
    @JsonProperty() public initiallyShowInWallet = false;

    constructor(
        network: AnyNetwork,
        name: string, // Symbol
        description: string, // Also known as "name" in EVM world.
        erc20ContractAddress: string,
        decimals: number,
        isCustom: boolean,
        initiallyShowInWallet = false, // Whether to show this coin as subwallet when a wallet is first used by the user
        timestamp = 0 // 0: builtin coin
    ) {
        // The id is tokenSymbol in version 2.2.0, but the tokenSymbol isn't unique.
        // So we use contract address as id.
        super(network, CoinType.ERC20, erc20ContractAddress, name, description, true, timestamp);

        // JSON serializer cannot work with decorators in constructor (runtime JS undefined errors)
        this.erc20ContractAddress = erc20ContractAddress;

        this.decimals = decimals;
        this.isCustom = isCustom;
        this.initiallyShowInWallet = initiallyShowInWallet;

        // Make contract addresses always lowercase for easier comparisons later one.
        if (erc20ContractAddress)
            this.erc20ContractAddress = erc20ContractAddress.toLowerCase();
    }

    /**
     * Returns the Ethereum sidechain smart contract address for this coin.
     * Used to operate this coin (balance, transfer, etc).
     */
    getContractAddress(): string {
        return this.erc20ContractAddress;
    }

    getDecimals(): number {
        return this.decimals;
    }

    coinIsCustom(): boolean {
        return this.isCustom;
    }

    static fromJson(jsonCoin: any, network: AnyNetwork): ERC20Coin {
        let coin = erc20CoinsSerializer.deserializeObject(jsonCoin, ERC20Coin);

        // Backward compatibility: fix wrong decimal type (string instead of number)
        if (Util.isNull(coin.decimals)) coin.decimals = -1
        else coin.decimals = parseInt("" + coin.decimals);

        coin.network = network;

        return coin;
    }
}