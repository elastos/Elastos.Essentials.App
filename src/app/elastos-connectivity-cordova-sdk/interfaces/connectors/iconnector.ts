import { IDIDConnectorAPI } from "./ididconnectorapi";
import { IWalletConnectorAPI } from "./iwalletconnectorapi";

export interface IConnector extends IDIDConnectorAPI, IWalletConnectorAPI {
    name: string;
}