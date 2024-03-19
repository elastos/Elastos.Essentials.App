import { green, yellow } from "colors";
import { parse } from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFile } from 'fs';
import { env } from "process";

console.log("Generating dev environment.ts file");

let localEnvPath = __dirname + "/.env";
let localEnv: any = {};
if (existsSync(localEnvPath)) {
  console.log(green("Using local .env file values to generate environment.ts"));
  localEnv = parse(readFileSync(localEnvPath));
}

const prodEnv = {
  production: true,
  EssentialsAPI: {
    serviceUrl: 'https://essentials-api.elastos.io/api/v1'
  },
  RedPackets: {
    webUrl: 'https://packet.fun',
    serviceUrl: 'https://api.packet.fun/api/v1'
  },
  CredentialsToolbox: {
    serviceUrl: 'https://credentials-toolbox.elastos.net/api/v1'
  },
  NownodesAPI: {
    apikey: localEnv.NOWNODES_API_KEY
  }
}

const devEnv = {
  production: false,
  EssentialsAPI: {
    serviceUrl: localEnv.NG_APP_ESSENTIALS_API_SERVICE_URL || prodEnv.EssentialsAPI.serviceUrl
  },
  RedPackets: {
    webUrl: env.ESSENTIALS_RED_PACKETS_WEB_URL || prodEnv.RedPackets.webUrl,
    serviceUrl: env.ESSENTIALS_RED_PACKETS_SERVICE_URL || prodEnv.RedPackets.serviceUrl
  },
  CredentialsToolbox: {
    serviceUrl: env.ESSENTIALS_CREDENTIALS_TOOLBOX_SERVICE_URL || prodEnv.CredentialsToolbox.serviceUrl
  },
  NownodesAPI: {
    apikey: localEnv.NOWNODES_API_KEY
  }
}

const devEnvironmentFile = `
// DO NOT EDIT - GENERATED BY set_env.ts
export const environment = ${JSON.stringify(devEnv, null, 2)};
`;

const prodEnvironmentFile = `
// DO NOT EDIT - GENERATED BY set_env.ts
export const environment = ${JSON.stringify(prodEnv, null, 2)};
`;

if (!existsSync("./src/environments"))
  mkdirSync("./src/environments");

writeFile('./src/environments/environment.ts', devEnvironmentFile, function (err) {
  if (err) {
    throw console.error(err);
  } else {
    console.log(`environment.ts file generated`);
  }
});

writeFile('./src/environments/environment.prod.ts', prodEnvironmentFile, function (err) {
  if (err) {
    throw console.error(err);
  } else {
    console.log(`environment.prod.ts file generated`);
  }
});

console.log("DEV environment is going to run with the following configuration:");
console.log(devEnv);

if (prodEnv.NownodesAPI.apikey.length === 0) {
  console.warn(yellow("Warning: The nownodes apikey for production is empty! You will not be able to obtain relevant data of the btc chain"));
}
