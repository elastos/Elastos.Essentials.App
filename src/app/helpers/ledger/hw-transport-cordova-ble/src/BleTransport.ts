/* eslint-disable prefer-template */
import type { DeviceModel } from "@ledgerhq/devices";
import {
    getBluetoothServiceUuids,
    getInfosForServiceUuid
} from "@ledgerhq/devices";
// import { receiveAPDU } from "@ledgerhq/devices/lib/ble/receiveAPDU";
// import { sendAPDU } from "@ledgerhq/devices/lib/ble/sendAPDU";
import {
    CantOpenDevice, DisconnectedDeviceDuringOperation, TransportError
} from "@ledgerhq/errors";
import Transport from "@ledgerhq/hw-transport";
import { defer, from, merge, Observable } from "rxjs";
import { first, ignoreElements, map, share, tap } from "rxjs/operators";
import { Logger } from "src/app/logger";
import { awaitsBleOn } from "./awaitsBleOn";
import { BLECentralPluginBridge } from "./BLECentralPluginBridge";
import { Device } from "./device";
import { monitorCharacteristic } from "./monitorCharacteristic";
import { decoratePromiseErrors, remapError } from "./remapErrors";
import type { Characteristic } from "./types";

const TAG = 'LedgerBleTransport';

const ConnectionPriority = [
    {"Balanced" :"balanced"},
    {"High" : "high"},
    {"LowPower" : "low"},
]

let connectOptions: Record<string, unknown> = {
  requestMTU: 156,
  connectionPriority: 1,
};
const transportsCache = {};

const bleManager = new BLECentralPluginBridge();

const retrieveInfos = (device) => {
  if (!device || !device.services) return;
  const [serviceUUID] = device.services;
  if (!serviceUUID) return;
  Logger.warn(TAG, 'getInfosForServiceUuid serviceUUID:', serviceUUID)
  const infos = getInfosForServiceUuid(serviceUUID);
  if (!infos) return;
  return infos;
};

type ReconnectionConfig = {
  pairingThreshold: number;
  delayAfterFirstPairing: number;
};
let reconnectionConfig: ReconnectionConfig | null | undefined = {
  pairingThreshold: 1000,
  delayAfterFirstPairing: 4000,
};
export function setReconnectionConfig(
  config: ReconnectionConfig | null | undefined
) {
  reconnectionConfig = config;
}

// eslint-disable-next-line no-promise-executor-return
const delay = (ms) => new Promise((success) => setTimeout(success, ms));

var stringToArrayBuffer = function (str) {
    var ret = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
        ret[i] = str.charCodeAt(i);
    }
    return ret.buffer;
};

var base64ToArrayBuffer = function (b64) {
    return stringToArrayBuffer(atob(b64));
};

async function open(deviceOrId: Device | string, needsReconnect: boolean) {
  let device = null;

  Logger.log(TAG, ' open deviceOrId:', deviceOrId, ' needsReconnect:', needsReconnect)
  if (typeof deviceOrId === "string") {
    if (transportsCache[deviceOrId]) {
      Logger.log(TAG, "Transport in cache, using that.");
      return transportsCache[deviceOrId];
    }

    await awaitsBleOn();

    // TODO: devices?
    // if (!device) {
    //   // works for iOS but not Android
    //   const devices = await bleManager.devices([deviceOrId]);
    //   log("ble-verbose", `found ${devices.length} devices`);
    //   [device] = devices;
    // }

    // TODO: connectedPeripheralsWithServices is only supported in iOS.
    // if (!device) {
    //   const connectedDevices = await bleManager.connectedDevices(
    //     getBluetoothServiceUuids()
    //   );
    //   const connectedDevicesFiltered = connectedDevices.filter(
    //     (d) => d.id === deviceOrId
    //   );
    //   log(
    //     "ble-verbose",
    //     `found ${connectedDevicesFiltered.length} connected devices`
    //   );
    //   [device] = connectedDevicesFiltered;
    // }

    if (!device) {
      Logger.log(TAG, "connectToDevice", deviceOrId);

      try {
        // device = await bleManager.connectToDevice(deviceOrId, connectOptions);
        device = await bleManager.connect(deviceOrId);
      } catch (e: any) {
        // TODO: "MTU request failed"?
        Logger.error(TAG, 'connect error ', e)
        // if (e.errorCode === BleErrorCode.DeviceMTUChangeFailed) {
        //   // eslint-disable-next-line require-atomic-updates
        //   connectOptions = {};
        // //   device = await bleManager.connectToDevice(deviceOrId);
        //   device = await bleManager.connect(deviceOrId);
        // } else {
          throw e;
        // }
      }
    }

    if (!device) {
      throw new CantOpenDevice();
    }
  } else {
    Logger.log(TAG, "deviceOrId is an object");
    device = new Device(deviceOrId);
  }

  Logger.warn(TAG, ' open device:', device)

  if (!(await device.isConnected())) {
    Logger.log(TAG, "not connected. connecting...");

    try {
    // TODO: connectOptions?: requestMtu is not supported on iOS.
    //   await device.connect(connectOptions);
      await device.connect();
    } catch (e: any) {
        // TODO: "MTU request failed"?
        Logger.error(TAG, 'connect error ', e)
    //   if (e.errorCode === BleErrorCode.DeviceMTUChangeFailed) {
    //     // eslint-disable-next-line require-atomic-updates
    //     connectOptions = {};
    //     await device.connect();
    //   } else {
        throw e;
    //   }
    }
  }

  await device.discoverAllServicesAndCharacteristics();
  let res = retrieveInfos(device);
  let characteristics;
  Logger.warn(TAG, ' retrieveInfos:', res)
  if (!res) {
    for (const uuid of getBluetoothServiceUuids()) {
      try {
        Logger.log(TAG, 'getInfosForServiceUuid uuid:', uuid)
        characteristics = await device.characteristicsForService(uuid);
        if (characteristics.length  == 0) {
            Logger.log(TAG, 'can not find characteristics for', uuid)
            continue;
        } else {
            res = getInfosForServiceUuid(uuid);
            Logger.log(TAG, 'getInfosForServiceUuid uuid:', uuid, ' Infos:', res)
            break;

        }
      } catch (e) {
        // we attempt to connect to service
      }
    }
  }

  if (!res) {
    throw new TransportError("service not found", "BLEServiceNotFound");
  }

  const { deviceModel, serviceUuid, writeUuid, writeCmdUuid, notifyUuid } = res;

  if (!characteristics) {
    characteristics = await device.characteristicsForService(serviceUuid);
  }

  if (!characteristics) {
    throw new TransportError("service not found", "BLEServiceNotFound");
  }

  let writeC;
  let writeCmdC;
  let notifyC;

  Logger.log(TAG, 'characteristics:', characteristics)
  for (const c of characteristics) {
    if (c.characteristic === writeUuid) {
      writeC = c;
    } else if (c.characteristic === writeCmdUuid) {
      writeCmdC = c;
    } else if (c.characteristic === notifyUuid) {
      notifyC = c;
    }
  }

  if (!writeC) {
    throw new TransportError(
      "write characteristic not found",
      "BLEChracteristicNotFound"
    );
  }

  if (!notifyC) {
    throw new TransportError(
      "notify characteristic not found",
      "BLEChracteristicNotFound"
    );
  }

  if (writeC.properties.indexOf('Write') <= -1) {
    throw new TransportError(
      "write characteristic not writableWithResponse",
      "BLEChracteristicInvalid"
    );
  }

  if (notifyC.properties.indexOf('Notify') <= -1) {
    throw new TransportError(
      "notify characteristic not notifiable",
      "BLEChracteristicInvalid"
    );
  }

  if (writeCmdC) {
    if (writeCmdC.properties.indexOf('WriteWithoutResponse') <= -1) {
      throw new TransportError(
        "write cmd characteristic not writableWithoutResponse",
        "BLEChracteristicInvalid"
      );
    }
  }

  Logger.log(TAG, `device.mtu=${device.mtu}`);
  const notifyObservable = monitorCharacteristic(device.id, notifyC).pipe(
    tap((value) => {
        Logger.log(TAG, "<= " + value.toString("hex"));
    }),
    share()
  );
  const notif = notifyObservable.subscribe();
  const transport = new BluetoothTransport(
    device,
    writeC,
    writeCmdC,
    notifyObservable,
    deviceModel
  );

  const onDisconnect = (e) => {
    transport.notYetDisconnected = false;
    notif.unsubscribe();
    disconnectedSub.remove();
    delete transportsCache[transport.id];
    Logger.log(TAG, 'BleTransport ', transport.id, ' disconnected');
    transport.emit("disconnect", e);
  };

  // eslint-disable-next-line require-atomic-updates
  transportsCache[transport.id] = transport;
  const disconnectedSub = device.onDisconnected((e) => {
    if (!transport.notYetDisconnected) return;
    onDisconnect(e);
  });
  const beforeMTUTime = Date.now();

  try {
    await transport.inferMTU();
  } finally {
    const afterMTUTime = Date.now();

    if (reconnectionConfig) {
      // workaround for #279: we need to open() again if we come the first time here,
      // to make sure we do a disconnect() after the first pairing time
      // because of a firmware bug
      if (afterMTUTime - beforeMTUTime < reconnectionConfig.pairingThreshold) {
        needsReconnect = false; // (optim) there is likely no new pairing done because mtu answer was fast.
      }

      if (needsReconnect) {
        // necessary time for the bonding workaround
        await BluetoothTransport.disconnect(transport.id).catch(() => {});
        await delay(reconnectionConfig.delayAfterFirstPairing);
      }
    } else {
      needsReconnect = false;
    }
  }

  if (needsReconnect) {
    return open(device, false);
  }
  Logger.log(TAG, 'open return transport', transport);
  return transport;
}
/**
 * react-native bluetooth BLE implementation
 * @example
 * import BluetoothTransport from "@ledgerhq/react-native-hw-transport-ble";
 */

export default class BluetoothTransport extends Transport {

  /**
   * TODO could add this concept in all transports
   * observe event with { available: bool, string } // available is generic, type is specific
   * an event is emit once and then listened
   */
  static observeState(observer: any) {
    const emitFromState = (type) => {
      observer.next({
        type,
        available: type === "on",
      });
    };

    // bleManager.onStateChange(emitFromState, true);
    bleManager.startStateNotifications(emitFromState);
    return {
      unsubscribe: () => {},
    };
  }

  static list = (): any => {
    throw new Error("not implemented");
  };

  /**
   * Scan for bluetooth Ledger devices
   */
  static listen(observer: any) {
    Logger.log(TAG, "listen...");
    let unsubscribed;
    // $FlowFixMe
    bleManager.startStateNotifications(async (state) => {
      Logger.log(TAG, ' StateNotifications ', state)
      if (state === "on") {
        await bleManager.stopStateNotifications();
        const devices = await bleManager.connectedDevices(
          getBluetoothServiceUuids()
        );
        if (unsubscribed) return;
        await Promise.all(
          devices.map((d) =>
            BluetoothTransport.disconnect(d.id).catch(() => {})
          )
        );
        if (unsubscribed) return;
        Logger.log(TAG, ' startScan ')
        bleManager.startScan(
          getBluetoothServiceUuids(),
          (device: BLECentralPlugin.PeripheralData) => {
            Logger.warn(TAG, "... find device:", device)
            const res = retrieveInfos(device);
            const deviceModel = res && res.deviceModel;
            observer.next({
              type: "add",
              descriptor: device,
              deviceModel,
            });
          },
          (error: string | BLECentralPlugin.BLEError) => {
            observer.error(error);
            unsubscribe();
          }
        );
      }
    });

    const unsubscribe = () => {
      unsubscribed = true;
      void bleManager.stopScan();
      void bleManager.stopStateNotifications();
      Logger.log(TAG, "done listening.");
    };

    return {
      unsubscribe,
    };
  }

  /**
   * Open a BLE transport
   * @param {*} deviceOrId
   */
  // eslint-disable-next-line require-await
  static async open(deviceOrId: Device | string) {
    Logger.warn(TAG, ' BluetoothTransport open ', deviceOrId)
    return open(deviceOrId, true);
  }

  /**
   * Globally disconnect a BLE device by its ID
   */
  static disconnect = async (id: any) => {
    Logger.log(TAG, "user disconnect ", id);
    await bleManager.disconnect(id);
  };
  id: string;
  device: Device;
  mtuSize = 20;
  writeCharacteristic: Characteristic;
  writeCmdCharacteristic: Characteristic;
  notifyObservable: Observable<Buffer>;
  deviceModel: DeviceModel;
  notYetDisconnected = true;

  constructor(
    device: Device,
    writeCharacteristic: Characteristic,
    writeCmdCharacteristic: Characteristic,
    notifyObservable: Observable<Buffer>,
    deviceModel: DeviceModel
  ) {
    super();
    this.id = device.id;
    this.device = device;
    this.writeCharacteristic = writeCharacteristic;
    this.writeCmdCharacteristic = writeCmdCharacteristic;
    this.notifyObservable = notifyObservable;
    this.deviceModel = deviceModel;
    Logger.log(TAG, "BleTransport new BluetoothTransport ", this);
  }

  /**
   * communicate with a BLE transport
   */
  exchange = (apdu: Buffer): Promise<any> =>
    this.exchangeAtomicImpl(async () => {
      Logger.log(TAG, "exchange exchangeAtomicImpl");
      try {
        const msgIn = apdu.toString("hex");
        Logger.log(TAG, "apdu", `=> ${msgIn}`);

        // TODO
        // const data = await merge(
        //   this.notifyObservable.pipe(receiveAPDU),
        //   sendAPDU(this.write, apdu, this.mtuSize)
        // ).toPromise();
        // const msgOut = (data as Buffer).toString("hex");
        // Logger.log(TAG, "apdu", `<= ${msgOut}`);
        // return data as Buffer;
      } catch (e: any) {
        Logger.log(TAG, "ble-error", "exchange got ", e);

        if (this.notYetDisconnected) {
          // in such case we will always disconnect because something is bad.
          await bleManager.disconnect(this.id).catch(() => {}); // but we ignore if disconnect worked.
        }

        throw remapError(e);
      }
    });

  // TODO we probably will do this at end of open
  async inferMTU() {
    let { mtu } = this.device;
    await this.exchangeAtomicImpl(async () => {
      try {
        mtu =
          (await merge(
            this.notifyObservable.pipe(
              first((buffer) => buffer.readUInt8(0) === 0x08),
              map((buffer) => buffer.readUInt8(5))
            ),
            defer(() => from(this.write(Buffer.from([0x08, 0, 0, 0, 0])))).pipe(
              ignoreElements()
            )
          ).toPromise()) + 3;
      } catch (e: any) {
        Logger.log(TAG, "inferMTU got error:", String(e));
        await bleManager.disconnect(this.id).catch(() => {}); // but we ignore if disconnect worked.

        throw remapError(e);
      }
    });

    if (mtu > 23) {
      const mtuSize = mtu - 3;
      Logger.log(TAG, 'BleTransport', this.id, ' mtu set to ', mtuSize);
      this.mtuSize = mtuSize;
    }

    return this.mtuSize;
  }

  async requestConnectionPriority(
    connectionPriority: "Balanced" | "High" | "LowPower"
  ) {
    await decoratePromiseErrors(
      this.device.requestConnectionPriority(
        ConnectionPriority[connectionPriority]
      )
    );
  }

  setScrambleKey() {}

  write = async (buffer: Buffer, txid?: string | null | undefined) => {
    Logger.log(TAG, "=> ", buffer.toString("hex"), " txid:", txid);

    if (!this.writeCmdCharacteristic) {
      try {
        await bleManager.write(this.id, this.writeCharacteristic.service,
            this.writeCharacteristic.characteristic, base64ToArrayBuffer(buffer.toString("base64")))
      } catch (e: any) {
        throw new DisconnectedDeviceDuringOperation(e.message);
      }
    } else {
      try {
        await bleManager.writeWithoutResponse(this.id, this.writeCmdCharacteristic.service,
                this.writeCmdCharacteristic.characteristic, base64ToArrayBuffer(buffer.toString("base64")))
      } catch (e: any) {
        throw new DisconnectedDeviceDuringOperation(e.message);
      }
    }
  };

  async close() {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    if (this.exchangeBusyPromise) {
      await this.exchangeBusyPromise;
    }
  }
}
