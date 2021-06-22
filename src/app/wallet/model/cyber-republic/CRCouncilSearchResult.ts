
export type CRCouncil = {
  avatar?: string,
  cid: string,
  did: string,
  didName: string,
  location: number,
  rejectRatio: number,
  impeachmentVotes: number,
  status: string,
}

export type Secretariat = {
  did: string,
  didName: string,
  status: string,
  startDate: number
}

export type CRCouncilSearchResponse = {
  code: number, // whether the api succeeded or not. 1 means ok.
  data: {
      council: CRCouncil[],
      secretariat: Secretariat[],
      circulatingSupply: number;
  },
  message: string; // Ex: "ok"
}