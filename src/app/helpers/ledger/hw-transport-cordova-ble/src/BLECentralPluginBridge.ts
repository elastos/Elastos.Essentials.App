import { Logger } from "src/app/logger";

declare let ble: BLECentralPlugin.BLECentralPluginStatic;
const TAG = 'LedgerBleCentralPluginBridge';
export class BLECentralPluginBridge {


    constructor() {
    }


    public scan(services: string[], seconds: number): Promise<BLECentralPlugin.PeripheralData> {
        Logger.log(TAG, ' scan ', services)
        return new Promise((resolve, reject) => {
            ble.scan(services, seconds,
                (data: BLECentralPlugin.PeripheralData) => { resolve(data); },
                (error: string | BLECentralPlugin.BLEError) => { reject(error); });
            });
    }

    public startScan(services: string[], success: (data: BLECentralPlugin.PeripheralData) => any,
                                        failure?: (error: string | BLECentralPlugin.BLEError) => any) {
        Logger.log(TAG, ' startScan ', services)
        return ble.startScan(services,  success, failure);
    }

    public startScanWithOptions(services: string[], options: BLECentralPlugin.StartScanOptions,
                success: (data: BLECentralPlugin.PeripheralData) => any, failure?: (error: string) => any) {
        Logger.log(TAG, ' startScanWithOptions ', services)
        return ble.startScanWithOptions(services, options, success, failure);
    }

    public stopScan(): Promise<void> {
        Logger.log(TAG, ' stopScan ')
        return ble.withPromises.stopScan();
    }

    public connect(device_id: string): Promise<BLECentralPlugin.PeripheralDataExtended> {
        Logger.log(TAG, ' connect ', device_id)
        return new Promise((resolve, reject) => {
            ble.connect(device_id,
                (data: BLECentralPlugin.PeripheralDataExtended) => { resolve(data); },
                (error: string | BLECentralPlugin.BLEError) => { reject(error); });
            });
    }

    public disconnect(device_id: string): Promise<void> {
        Logger.log(TAG, ' disconnect ', device_id)
        return ble.withPromises.disconnect(device_id);
    }

    public autoConnect(device_id: string): Promise<BLECentralPlugin.PeripheralDataExtended> {
        Logger.log(TAG, ' autoConnect ', device_id)
        return new Promise((resolve, reject) => {
            ble.autoConnect(device_id,
                (data: BLECentralPlugin.PeripheralDataExtended) => { resolve(data); },
                (error: string | BLECentralPlugin.BLEError) => { reject(error); });
            });
    }

    public connectedDevices(serviceUUIDs: string[]): Promise<BLECentralPlugin.PeripheralData[]> {
        Logger.log(TAG, ' connectedDevices serviceUUIDs:', serviceUUIDs)
        return new Promise((resolve, reject) => {
            // if (this.platform.platforms().indexOf('ios') >= 0) {
                ble.connectedPeripheralsWithServices(serviceUUIDs,
                    (data: BLECentralPlugin.PeripheralData[]) => { resolve(data); },
                    () => { resolve([]); });
            // } else {
            //     ble.bondedDevices(
            //         (data: BLECentralPlugin.PeripheralData[]) => {
            //             // TODO: get the matched data.
            //             resolve([]);
            //         },
            //         () => { resolve([]); });
            // }
        });
    }

    public requestConnectionPriority(device_id: string, priority: 'high' | 'balanced' | 'low'): Promise<void> {
        Logger.log(TAG, ' requestConnectionPriority ', device_id)
        return new Promise((resolve, reject) => {
            ble.requestConnectionPriority(device_id, priority,
                () => { resolve(); },
                () => { reject(); });
            });
    }

    public isEnabled(): Promise<boolean> {
        Logger.log(TAG, ' isEnabled ')
        return new Promise((resolve, reject) => {
            ble.isEnabled(
                () => { resolve(true); },
                () => { resolve(false); });
            });
    }

    public isConnected(device_id: string): Promise<boolean> {
        Logger.log(TAG, ' isConnected ', device_id)
        return new Promise((resolve, reject) => {
            ble.isConnected(device_id,
                () => { resolve(true); },
                () => { resolve(false); });
            });
    }

    public startStateNotifications(success: (state: string) => any, failure?: (error: string) => any) {
        Logger.log(TAG, ' startStateNotifications ')
        return ble.startStateNotifications(success, failure);
    }

    public stopStateNotifications(): Promise<void> {
        Logger.log(TAG, ' stopStateNotifications ')
        return ble.withPromises.stopStateNotifications()
    }

    public write(device_id: string,
        service_uuid: string,
        characteristic_uuid: string,
        value: ArrayBuffer): Promise<void> {
        Logger.log(TAG, ' write ')
        return ble.withPromises.write(device_id, service_uuid, characteristic_uuid, value);
    }

    public writeWithoutResponse(device_id: string,
        service_uuid: string,
        characteristic_uuid: string,
        value: ArrayBuffer): Promise<void> {
        Logger.log(TAG, ' writeWithoutResponse ')
        return ble.withPromises.writeWithoutResponse(device_id, service_uuid, characteristic_uuid, value);
    }

}
