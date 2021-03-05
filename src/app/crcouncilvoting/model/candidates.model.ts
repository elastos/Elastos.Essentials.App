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
