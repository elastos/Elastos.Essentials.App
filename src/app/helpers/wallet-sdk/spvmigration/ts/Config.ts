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

    public Name(): string {
        return this._name;
    }

    public ChainID(): number {
        return this._chainId;
    }

    public NetworkID(): number {
        return this._networkId;
    }

    /* Config:: Config(const Config & cfg) {
        this -> operator=(cfg);
    }

    Config:: Config(const std:: string & netType, const nlohmann:: json & config) {
        _netType = netType;
        if (_netType != CONFIG_MAINNET && _netType != CONFIG_TESTNET &&
            _netType != CONFIG_REGTEST && _netType != CONFIG_PRVNET) {
            Log:: error("invalid NetType: {} in config json", _netType);
        }

        FromJSON(config);

    } */
}

type ConfigMap = {
    [configName: string, ChainConfig]
};

export class Config {
    private _netType: string;
    private _chains: ConfigMap = {};

    /*     Config & Config:: operator = (const Config &cfg) {
        this -> _netType = cfg._netType;
        this -> _chains = cfg._chains;

        return * this;
    } */

    GetChainConfig(id: string): ChainConfig {
        return this._chains[id];
    }

    FromJSON(j: json): boolean {
        try {
            for (nlohmann:: json::const_iterator it = j.cbegin(); it != j.cend(); ++it) {
                if (it.key() == "NetType")
                    continue;

                std::string chainID = it.key();

                    ChainConfigPtr chainConfig(new ChainConfig());
                if (chainID.find("ETH") != std:: string::npos) {
                    nlohmann::json chainConfigJson = it.value();
                    chainConfig -> _name = chainID + "-" + _netType;

                    chainConfig -> _chainId = chainConfigJson["ChainID"].get<int>();
                    chainConfig -> _networkId = chainConfigJson["NetworkID"].get<int>();
                }

                _chains[chainID] = chainConfig;
            }

            return true;
        } catch (e) {
            Log.error("config json format error: ", e);
        }

        return false;
    }

    GetAllChainIDs(): string[] {
        /* WAS std:: for_each(_chains.begin(), _chains.end(),
            [& result](const std:: map<std:: string, ChainConfigPtr >:: value_type & item) {
            result.push_back(item.first);
        });
        return result;
        */

        return Object.keys(this._chains);
    }

    public GetNetType(): string {
        return this._netType;
    }

    public GetConfigs(): ConfigMap {
        return this._chains;
    }
}