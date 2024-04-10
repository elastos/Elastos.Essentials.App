export type UnisatInscription = {
  inscriptionId: string;
  inscriptionNumber: number;
  isBRC20: boolean;
  moved: boolean;
  offset: number;
  sequence: number;
}

export type UnisatUtxo = {
  address: string;
  codeType: number; // 9
  height: number;
  idx: number;
  inscriptions: UnisatInscription[];
  isOpInRBF: boolean;
  isSpend: boolean;
  satoshi: number;
  scriptPk: string;
  scriptType: string;
  txid: string;
  vout: number;
}

export type UnisatResponse = {
  code: number;   // 0: Success, -1: Fail
  msg: string;    // "OK"; "address invalid"
  data: UnisatUtxoData
}

export type UnisatUtxoData = {
  cursor: number;
  total: number;
  totalConfirmed: number;
  totalUnconfirmed: number;
  totalUnconfirmedSpend: number;
  utxo: UnisatUtxo[]
}
