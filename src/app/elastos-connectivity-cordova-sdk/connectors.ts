import { IConnector } from "./interfaces/connectors/iconnector";

export class Connectors {
    private static connectors: IConnector[] = [];
    private static activeConnector: IConnector | null = null;

    /**
     * Registers a new connector as part of the available service providers.
     * This connector can then be selected by the app or by the end users to manage
     * their Elastos operations (get credentials, authenticate on hive, call smart contracts, etc).
     */
    public static registerConnector(connector: IConnector) {
        this.connectors.push()
    }

    /**
     * Sets the active connector for the whole application. The active connector is used
     * by all Elastos operation that require access to a connector API.
     */
    public static setActiveConnector(connectorName: string) {
        this.activeConnector = this.connectors.find((c)=>c.name === connectorName);
    }

    public static getActiveConnector(): IConnector | null {
        return this.activeConnector;
    }
}
