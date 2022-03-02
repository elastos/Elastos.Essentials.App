import { Logger } from "src/app/logger";

declare let ble: BLECentralPlugin.BLECentralPluginStatic;
const TAG = 'LedgerBleDevice';

export class Device {
    public name: string;
    public id: string;
    public rssi: number;
    public advertising: ArrayBuffer | any;
    public state: BLECentralPlugin.PeripheralState;
    public services: string[];
    public characteristics: BLECentralPlugin.PeripheralCharacteristic[];

    // public mtu = 156;
    public mtu = 64;

    constructor(data:BLECentralPlugin.PeripheralDataExtended) {
        this.copyData(data);
    }

    private copyData(data:BLECentralPlugin.PeripheralDataExtended) {
        Logger.log(TAG, ' copyData', data)
        if (!data) return;
        this.name = data.name;
        this.id = data.id
        this.rssi = data.rssi;
        this.advertising = data.advertising
        this.state = data.state
        if (data.services) {
            this.services = [...data.services]
        } else {
            this.services = [];
        }

        if (data.characteristics) {
            this.characteristics = [...data.characteristics]
        } else {
            this.characteristics = [];
        }
    }

    public isConnected(): Promise<boolean> {
        Logger.log(TAG, ' isConnected')
        return new Promise((resolve, reject) => {
            ble.isConnected(this.id,
                () => { resolve(true); },
                () => { resolve(false); });
            });
    }

    public connect(): Promise<BLECentralPlugin.PeripheralDataExtended> {
        Logger.log(TAG, ' connect')
        return new Promise((resolve, reject) => {
            ble.connect(this.id,
                (data: BLECentralPlugin.PeripheralDataExtended) => {
                    Logger.warn(TAG, 'device connected', this.id)
                    this.copyData(data);resolve(data); },
                (error: string | BLECentralPlugin.BLEError) => { reject(error); });
            });
    }

    // Delete it, we get all services and characteristics when connect.
    public discoverAllServicesAndCharacteristics(): Promise<void> {
        return null;
    }

    public characteristicsForService(uuid: string): BLECentralPlugin.PeripheralCharacteristic[] {
        return this.characteristics.filter( c => {
            return c.service == uuid;
        })
    }

    public requestMtu(mtu: number): Promise<void> {
        return new Promise((resolve, reject) => {
            ble.requestMtu(this.id, mtu,
                () => { resolve(); },
                () => { reject(); });
            });
    }

    public requestConnectionPriority(priority: 'high' | 'balanced' | 'low'): Promise<void> {
        return new Promise((resolve, reject) => {
            ble.requestConnectionPriority(this.id, priority,
                () => { resolve(); },
                () => { reject(); });
            });
    }

    // TODO:
    public onDisconnected(fun:any) {

    }

}
