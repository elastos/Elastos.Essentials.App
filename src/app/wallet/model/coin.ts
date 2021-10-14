
export type CoinID = string; // ELA, IDChain, ERC1, ERC2...

export enum CoinType {
    STANDARD = "STANDARD", // For ELA, IDChain, ETHSC
    ERC20 = "ERC20" // For ERC20 tokens
}

export enum StandardCoinName {
    ELA = 'ELA',
    IDChain = 'IDChain',
    ETHSC = 'ETHSC',
    ETHDID = 'ETHDID',
    ETHHECO = 'ETHHECO',
    ETHBSC = 'ETHBSC',
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

export class Coin {
    constructor(
        private type: CoinType,
        private id: CoinID,
        private name: string,
        private description: string,
        private removable: boolean,
        public networkTemplate: string,
        public timestamp = 0 // 0: builtin coin
    ) { }

    public getType(): CoinType {
        return this.type;
    }

    public getID(): CoinID {
        return this.id;
    }

    public getName(): string {
        return this.name;
    }

    public getDescription(): string {
        return this.description;
    }

    public canBeRemoved(): boolean {
        return this.removable;
    }

    getCreatedTime(): number {
        return this.timestamp;
    }
}

export class StandardCoin extends Coin {
    constructor(id: CoinID, name: string, description: string) {
        // Null network means that the coin is available on all networks
        let removable = false;
        if (id === StandardCoinName.IDChain) {
            removable = true;
        }
        super(CoinType.STANDARD, id, name, description, removable, null);
    }
}

export class ERC20Coin extends Coin {
    constructor(
        name: string,
        description: string,
        private erc20ContractAddress: string,
        public decimals: number,
        networkTemplate: string,
        private isCustom: boolean,
        public initiallyShowInWallet = false, // Whether to show this coin as subwallet when a wallet is first used by the user
        public timestamp = 0 // 0: builtin coin
    ) {
        // The id is tokenSymbol in version 2.2.0, but the tokenSymbol isn't unique.
        // So we use contract address as id.
        super(CoinType.ERC20, erc20ContractAddress, name, description, true, networkTemplate, timestamp);

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

    static fromJson(jsonCoin: any): ERC20Coin {
        let coin = new ERC20Coin(null, null, null, -1, null, null);
        Object.assign(coin, jsonCoin);
        return coin;
    }
}