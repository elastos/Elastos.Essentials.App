import { Logger } from "src/app/logger";

declare let ble: BLECentralPlugin.BLECentralPluginStatic;
const TAG = 'LedgerBleCentralPluginBridge';
export class BLECentralPluginBridge {
    public scan(services: string[], seconds: number): Promise<BLECentralPlugin.PeripheralData> {
        return new Promise((resolve, reject) => {
            ble.scan(services, seconds,
                (data: BLECentralPlugin.PeripheralData) => { resolve(data); },
                (error: string | BLECentralPlugin.BLEError) => { reject(error); });
            });
    }

    public startScan(services: string[], success: (data: BLECentralPlugin.PeripheralData) => any,
                                        failure?: (error: string | BLECentralPlugin.BLEError) => any) {
        return ble.startScan(services,  success, failure);
    }

    public startScanWithOptions(services: string[], options: BLECentralPlugin.StartScanOptions,
                success: (data: BLECentralPlugin.PeripheralData) => any, failure?: (error: string) => any) {
        return ble.startScanWithOptions(services, options, success, failure);
    }

    public stopScan(): Promise<void> {
        return ble.withPromises.stopScan();
    }

    public connect(device_id: string): Promise<BLECentralPlugin.PeripheralDataExtended> {
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
        return new Promise((resolve, reject) => {
            ble.autoConnect(device_id,
                (data: BLECentralPlugin.PeripheralDataExtended) => { resolve(data); },
                (error: string | BLECentralPlugin.BLEError) => { reject(error); });
            });
    }

    public bondedDevices(): Promise<BLECentralPlugin.PeripheralData[]> {
        Logger.log(TAG, ' connectedDevices serviceUUIDs:')
        return new Promise((resolve, reject) => {
                ble.bondedDevices(
                    (data: BLECentralPlugin.PeripheralData[]) => {
                        resolve(data);
                    },
                    () => { resolve([]); });
        });
    }

    // [Android] peripheralsWithIdentifiers is not supported on Android.
    public connectedPeripheralsWithServices(serviceUUIDs: string[]): Promise<BLECentralPlugin.PeripheralData[]> {
        Logger.log(TAG, ' connectedPeripheralsWithServices serviceUUIDs:', serviceUUIDs)
        return new Promise((resolve, reject) => {
            ble.connectedPeripheralsWithServices(serviceUUIDs,
                (data: BLECentralPlugin.PeripheralData[]) => { resolve(data); },
                () => { resolve([]); });
        });
    }

    public requestConnectionPriority(device_id: string, priority: 'high' | 'balanced' | 'low'): Promise<void> {
        return new Promise((resolve, reject) => {
            ble.requestConnectionPriority(device_id, priority,
                () => { resolve(); },
                () => { reject(); });
            });
    }

    public isEnabled(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            ble.isEnabled(
                () => { resolve(true); },
                () => { resolve(false); });
            });
    }

    public isConnected(device_id: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            ble.isConnected(device_id,
                () => { resolve(true); },
                () => { resolve(false); });
            });
    }

    public showBluetoothSettings() {
        return ble.withPromises.showBluetoothSettings();
    }

    public startStateNotifications(success: (state: string) => any, failure?: (error: string) => any) {
        return ble.startStateNotifications(success, failure);
    }

    public stopStateNotifications(): Promise<void> {
        return ble.withPromises.stopStateNotifications()
    }

    public write(device_id: string,
                service_uuid: string,
                characteristic_uuid: string,
                value: ArrayBuffer): Promise<void> {
        return ble.withPromises.write(device_id, service_uuid, characteristic_uuid, value);
    }

    public writeWithoutResponse(device_id: string,
                                service_uuid: string,
                                characteristic_uuid: string,
                                value: ArrayBuffer): Promise<void> {
        return ble.withPromises.writeWithoutResponse(device_id, service_uuid, characteristic_uuid, value);
    }
}
