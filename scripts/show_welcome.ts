#!/usr/bin/env ts-node
const colors = require("colors");
const fs = require("fs");

let elastosLogo = fs.readFileSync(__dirname + "/elastos_ansi.txt").toString()
console.log(elastosLogo);

console.log();
console.log(colors.cyan("ESSENTIALS - WELCOME"));
console.log();
console.log(colors.gray("Here are some useful ENV variables:"));

console.log(colors.green("  ESSENTIALS_IOS_RUN_DEVICE"));
console.log(`  Device ID to use while running Essentials on iOS simulator.`);
console.log(`  The best device is automatically chosen if you don't configure this value.`);
console.log(`  Call ${colors.cyan("npm run ios-list-devices")} to get available iOS target IDs`);
console.log(colors.gray(`  Eg: export ESSENTIALS_IOS_RUN_DEVICE=63D13760-557B-4716-A283-599A2637232E`));

console.log();
console.log(colors.green("  ESSENTIALS_RED_PACKETS_SERVICE_URL") + " and " + colors.green("ESSENTIALS_RED_PACKETS_WEB_URL"));
console.log(`  Define those variables if you want to run a local red packets service instead of using the prod apis.`);
console.log(colors.gray(`  Eg: export ESSENTIALS_RED_PACKETS_SERVICE_URL=https://192.168.1.4:5080/api/v1`));

console.log();
console.log(colors.green("  ESSENTIALS_CREDENTIALS_TOOLBOX_SERVICE_URL"));
console.log(`  Define this variable if you want to run a local credentials toolbox service instead of using the prod apis.`);
console.log(colors.gray(`  Eg: export ESSENTIALS_CREDENTIALS_TOOLBOX_SERVICE_URL=http://192.168.1.4:3020/api/v1`));

console.log();
console.log(colors.green("  ESSENTIALS_TOOLCHAIN_DOWNLOAD_PROXY"));
console.log(`  If downloads are slow, you can configure a proxy by setting ESSENTIALS_TOOLCHAIN_DOWNLOAD_PROXY.`);
console.log(colors.gray(`  Eg: export ESSENTIALS_TOOLCHAIN_DOWNLOAD_PROXY=socks5://127.0.0.1:1080`));

console.log();
console.log(colors.green("  NOWNODES_API_KEY"));
console.log(`  Must be configure for BTC operations to work.`);
console.log(colors.gray(`  Eg: environment/.env: NOWNODES_API_KEY=abcdef`));

console.log();