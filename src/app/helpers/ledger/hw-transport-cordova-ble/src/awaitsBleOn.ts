import { BluetoothRequired } from "@ledgerhq/errors";
import { Logger } from "src/app/logger";
import timer from "./timer";

declare let ble: BLECentralPlugin.BLECentralPluginStatic;

export const awaitsBleOn = (ms = 3000): Promise<void> =>
  new Promise((resolve, reject) => {
    let done = false;
    let lastState = "Unknown";

    ble.startStateNotifications((state) => {
        lastState = state;
        Logger.warn('ledger', "StateNotifications Bluetooth is " + state)

        if (state === "on") {
            if (done) return;
            removeTimeout();
            done = true;
            ble.stopStateNotifications();
            resolve();
          }
    }, (error)=> {
        reject(
            new BluetoothRequired("", {
              state: lastState,
            })
        );
    });
    const removeTimeout = timer.timeout(() => {
      if (done) return;
      ble.stopStateNotifications();
      reject(
        new BluetoothRequired("", {
          state: lastState,
        })
      );
    }, ms);
  });
