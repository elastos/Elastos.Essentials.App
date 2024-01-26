export enum InscriptionOperation {
  Deploy = "deploy",
  List = "list",
  Mint = "mint",
  Transfer = "transfer",
}
export type InscriptionInfo = {
  protocol: string; // esc-20
  operation: string; // Operation: Type of event (Deploy, Mint, Transfer,List)
  ticker: string; // Identifier of the esc-20
  amount?: string;
  max?: string; // Max supply: Set max supply of the esc-20
  lim?: string; // Mint limit: limit per inscription
};

export class InscriptionUtil {
  public static async getInscriptionData(txData: string): Promise<string> {
    const hexToUtf8 = (await import("web3-utils")).hexToUtf8;
    return hexToUtf8(txData).substring(6);
  }

  public static async parseData(txData: string): Promise<InscriptionInfo> {
    let data = await this.getInscriptionData(txData);
    let jsonObj = JSON.parse(data);

    let info: InscriptionInfo = {
      protocol: jsonObj.p,
      operation: jsonObj.op,
      ticker: jsonObj.tick,
      amount: jsonObj.amt,
      max: jsonObj.max,
      lim: jsonObj.lim,
    };
    return info;
  }
}
