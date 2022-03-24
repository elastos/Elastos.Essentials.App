#!/usr/bin/env ts-node

import { env } from "process";

const { execSync } = require("child_process");

// eslint-disable-next-line require-await
void (async () => {
  let stdout = execSync("ionic cordova run ios --list --json").toString();

  // Remove the strange [native-run] prefix on every line
  let cleanJsonStr = stdout.replace(/\[native-run\]/g, "");

  /**
   * {
      devices: [],
      virtualDevices: [
        {
          platform: 'ios',
          name: 'iPad (8th generation)',
          sdkVersion: '14.3',
          id: 'E7D3ACFD-11A7-4681-BDEB-AF40B5147906'
        },
      ]
    }
   */
  let rawDevices = JSON.parse(cleanJsonStr);

  let virtualDevicesToUse: { id: string; name: string; sdkVersion: string }[] = rawDevices.virtualDevices.filter(vd => (
    vd.name as string).indexOf("iPhone") >= 0);

  /**
   * Automatically finds and returns the ios device ID based on the following order:
   * - if env.ESSENTIALS_IOS_RUN_DEVICE is set and exists, use this one
   * - Find "iPhone XX Pro Max" devices. Among them, find the highest number (most recent iphone)
   */

  let deviceId: string = null;
  if (env.ESSENTIALS_IOS_RUN_DEVICE) {
    let targetDeviceId = env.ESSENTIALS_IOS_RUN_DEVICE;
    let device = virtualDevicesToUse.find(d => d.id === targetDeviceId);
    if (device)
      deviceId = device.id;
  }

  // Fallback: default strategy
  if (!deviceId) {
    let proMaxIPhones: { id: string; name: string; version: number; sdkVersion: number }[] = [];
    for (let d of virtualDevicesToUse) {
      let verifier = new RegExp(/iPhone ([0-9]+) Pro Max/gm).exec(d.name);
      if (verifier) {
        proMaxIPhones.push({
          id: d.id,
          name: d.name,
          version: parseInt(verifier[1]),
          sdkVersion: parseFloat(d.sdkVersion)
        })
      }
    }

    // Sort by version DESC, and in case of equality, sdk version DESC
    proMaxIPhones.sort((a, b) => {
      if (a.version === b.version)
        return b.sdkVersion - a.sdkVersion;

      return b.version - a.version;
    });

    // The winner is the first item in the array
    deviceId = proMaxIPhones[0].id;
  }

  console.log(deviceId);
  process.exit(0);
})();
