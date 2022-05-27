import { TransportError } from "@ledgerhq/errors";
import { Observable } from "rxjs";
import { Logger } from "src/app/logger";
import type { Characteristic } from "./types";

declare let ble: BLECentralPlugin.BLECentralPluginStatic;

const TAG = 'LedgerMonitorCharacteristic';

export const monitorCharacteristic = (
  device_id,
  characteristic: Characteristic
): Observable<Buffer> =>
  new Observable((o) => {
    // Logger.log(TAG, "start notification ", characteristic.characteristic);
    ble.startNotification(device_id, characteristic.service, characteristic.characteristic, (rawData:ArrayBuffer)=>{
        // Logger.log(TAG, "got notification rawData:", rawData);
        if (!rawData) {
            o.error(new TransportError("characteristic monitor null value",
                    "CharacteristicMonitorNull"));
        } else {
            try {
                const value = Buffer.from(rawData);
                o.next(value);
            } catch (error) {
                o.error(error);
            }
        }
    }, (error: string | BLECentralPlugin.BLEError)=>{
        Logger.warn(TAG,  "notification error ", characteristic.characteristic, ": ", error);
        o.error(error);
    });
    return () => {
        void ble.withPromises.stopNotification(device_id, characteristic.service, characteristic.characteristic);
    };
  });
