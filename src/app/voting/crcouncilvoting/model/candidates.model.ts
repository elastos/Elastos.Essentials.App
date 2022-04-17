export class Candidate {
  constructor(
    public code: string,
    public cid: string,
    public did: string,
    public nickname: string,
    public url: string,
    public location: any,
    public state: string,
    public votes: string,
    public registerheight: number,
    public cancelheight: number,
    public index: number,
    public imageUrl: any,
  ) {}
}

export type CandidateBaseInfo = {
    cid?: string,
    did?: string,
    nickname: string,
    url: string,
    location: number,
    ownerpublickey?: string,
    state: string,
    txConfirm?: boolean,
    votes?: number,
}
