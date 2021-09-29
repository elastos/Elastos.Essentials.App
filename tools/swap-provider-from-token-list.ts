/**
 * NODE script.
 * Run with ts-node xxx.
 * From a tokenlists.org standard JSON url, generates a TS array ready to be copied into a swap provider.
 */

type TokenListToken = {
  name: string; // ex: '1Inch',
  chainId: number; // ex: 1,
  symbol: string; // ex: '1INCH',
  decimals: number; // ex: 18,
  address: string; // ex: '0x111111111117dc0aa78b770fa6a738034120c302',
  logoURI: string; // ex: 'https://gemini.com/images/currencies/icons/default/1inch.svg'
}

type TokenListsList = {
  name: string; // List name
  version: { major: number, minor: number, patch: number };
  keywords: string[];
  logoURI: string; // ex: 'https://gemini.com/static/images/loader.png',
  timestamp: string; // ex: '2021-03-23T14:15:22+0000',
  tokens: TokenListToken[]
}

const https = require('https');

if (process.argv.length != 4) {
  console.error("Syntax: ts-node swap-provider-from-token-list TOKENLISTJSONURL CHAINID");
  process.exit(1);
}

let url = process.argv[2];
let targetChainId = parseInt(process.argv[3]);

console.log("Fetching " + url);

https.get(url, (resp) => {
  let dataRaw = '';

  // A chunk of data has been received.
  resp.on('data', (chunk) => {
    dataRaw += chunk;
  });

  // The whole response has been received. Print out the result.
  resp.on('end', () => {
    let tokenList: TokenListsList = JSON.parse(dataRaw);

    console.log("");
    console.log("Found tokens:");
    console.log("");
    tokenList.tokens.forEach(t => {
      if (t.chainId === targetChainId) // Make sure we get tokens for the right chain only
        console.log("\"" + t.address + "\", // " + t.symbol.toUpperCase());
    });
    console.log("");
  });

}).on("error", (err) => {
  console.error("Error: " + err.message);
});
