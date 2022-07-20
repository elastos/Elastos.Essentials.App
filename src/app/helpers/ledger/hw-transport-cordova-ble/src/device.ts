import { Subject } from "rxjs";
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

    public disConnectEvent: Subject<string> = new Subject();

    constructor(data:BLECentralPlugin.PeripheralDataExtended) {
        this.copyData(data);
    }

    private copyData(data:BLECentralPlugin.PeripheralDataExtended) {
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
        return new Promise((resolve, reject) => {
            ble.isConnected(this.id,
                () => { resolve(true); },
                () => { resolve(false); });
            });
    }

    public connect(): Promise<BLECentralPlugin.PeripheralDataExtended> {
        Logger.log(TAG, ' device connect', this.id)
        return new Promise((resolve, reject) => {
            ble.connect(this.id,
                (data: BLECentralPlugin.PeripheralDataExtended) => {
                    Logger.log(TAG, 'device connected', this.id)
                    this.copyData(data);resolve(data); },
                (error: string | BLECentralPlugin.BLEError) => { reject(error); });
            });
    }

    public async disconnect(): Promise<void> {
        Logger.log(TAG, ' disconnect ', this.id)
        await ble.withPromises.disconnect(this.id);
        this.disConnectEvent.next(this.id);
        return;
    }

    // Delete it, we get all services and characteristics when connect.
    public discoverAllServicesAndCharacteristics(): Promise<void> {
        return null;
    }

    public characteristicsForService(uuid: string): BLECentralPlugin.PeripheralCharacteristic[] {
        let uuidLowCase = uuid.toLowerCase()
        return this.characteristics.filter( c => {
            return c.service.toLowerCase() === uuidLowCase;
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
        Logger.warn(TAG, 'device onDisconnected ', this.id)
        return this.disConnectEvent.subscribe( (id)=> {
          Logger.warn(TAG, 'device onDisconnected event id', id, fun)
          if (fun) fun(id);
        })
    }

}
