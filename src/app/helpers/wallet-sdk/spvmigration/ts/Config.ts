// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Log } from "./common/Log";
import { json } from "./types";

export const CONFIG_MAINNET = "MainNet";
export const CONFIG_TESTNET = "TestNet";
export const CONFIG_REGTEST = "RegTest";
export const CONFIG_PRVNET = "PrvNet";

export class ChainConfig {
    private _name: string;
    private _chainId: number;
    private _networkId: number;

    constructor() {
        this._chainId = 0;
        this._networkId = 0;
    }

    public name(): string {
        return this._name;
    }

    public setName(name: string) {
        this._name = name;
    }

    public chainID(): number {
        return this._chainId;
    }

    public setChainId(chainId: number) {
        this._chainId = chainId;
    }

    public networkID(): number {
        return this._networkId;
    }

    public setNetworkId(networkId: number) {
        this._networkId = networkId;
    }
}

type ConfigMap = {
    [configName: string]: ChainConfig
};

export class Config {
    private _netType: string;
    private _chains: ConfigMap = {};

    private constructor() {
    }

    public static newFromParams(netType: string, config: json) {
        let cfg = new Config();

        cfg._netType = netType;
        if (cfg._netType != CONFIG_MAINNET && cfg._netType != CONFIG_TESTNET &&
            cfg._netType != CONFIG_REGTEST && cfg._netType != CONFIG_PRVNET) {
            Log.error("invalid NetType: {} in config json", cfg._netType);
        }

        cfg.fromJSON(config);

        return cfg;
    }

    public static newFromConfig(cfg: Config) {
        let config = new Config();
        config._netType = cfg._netType;
        config._chains = cfg._chains;
        return config;
    }

    getChainConfig(id: string): ChainConfig {
        return this._chains[id];
    }

    fromJSON(j: json): boolean {
        try {
            for (let key of Object.keys(j)) {
                if (key == "NetType")
                    continue;

                let chainID: string = key;

                let chainConfig = new ChainConfig();
                if (chainID.indexOf("ETH") !== 0) {
                    let chainConfigJson: json = j[key] as json;
                    chainConfig.setName(chainID + "-" + this._netType);

                    chainConfig.setChainId(chainConfigJson["ChainID"] as number);
                    chainConfig.setNetworkId(chainConfigJson["NetworkID"] as number);
                }

                this._chains[chainID] = chainConfig;
            }

            return true;
        } catch (e) {
            Log.error("config json format error: ", e);
        }

        return false;
    }

    getAllChainIDs(): string[] {
        /* WAS std:: for_each(_chains.begin(), _chains.end(),
            [& result](const std:: map<std:: string, ChainConfigPtr >:: value_type & item) {
            result.push_back(item.first);
        });
        return result;
        */

        return Object.keys(this._chains);
    }

    public getNetType(): string {
        return this._netType;
    }

    public getConfigs(): ConfigMap {
        return this._chains;
    }
}