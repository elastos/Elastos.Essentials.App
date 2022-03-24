#!/usr/bin/env ts-node

const { execSync } = require("child_process");
const prompts = require('prompts');
//const ttys = require("ttys");

/*
const stdin = process.stdin;

const test = async (): Promise<void> => {
  let data = '';

  stdin.on('data', function (chunk) {
    data += chunk;
  });

  stdin.on('end', function () {
    console.log("Hello " + data);
  });
}

test().then(() => { }); */

(async () => {
  /* setTimeout(() => {
    console.log("timeout")
  }, 20000); */
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
  //console.log(rawDevices);

  let virtualDevicesToUse: { id: string; name: string }[] = rawDevices.virtualDevices.filter(vd => (
    vd.name as string).indexOf("iPhone") >= 0);

  /* prompts([{
    name: 'device',
    message: 'iOS device to use',
    type: 'select',
    choices: virtualDevicesToUse.map(vd => {
      return { value: vd.id, title: vd.name }
    }),
    // stdin: ttys.stdin
  }]).then(resp => {
    console.log("prompt resp ", resp);
  }) */

  /* virtualDevicesToUse.forEach(item => {
    console.log(`${item.name}: ${item.id}`);
  }) */


  console.log("toto");
  process.exit(0);
  //ttys.stdin.destroy();

  //return response.device;
  //process.exit(1);
  // resolve(response.device);
})();


console.log("aa")