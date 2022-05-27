/**
 * Types for "Add ERC20 token" requests coming from wallet connect using the wallet_watchAsset
 * ethereum JSON RPC method. We also use this same type for our internal intent requests.
 */
export type AddERCTokenRequestParams = {
  type: "ERC20", // Only ERC20 supported for now.
  options: {
    address: string,
    decimals?: number, // Ex: 18
    image?: string, // Token image url. Ex: http://placekitten.com/200/300
    symbol?: string, // Ex: "BTC"
  }
}