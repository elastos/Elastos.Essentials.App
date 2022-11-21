// data for ELA mainchain api provider nodes
export type DPoS2Node = {
    active: boolean;
    cancelheight: number;
    dposv2votes: string;
    identity: string;
    illegalheight: number;
    inactiveheight: number;
    index: number;
    location: number;
    nickname: string;
    nodepublickey: string;
    ownerpublickey: string;
    registerheight: number;
    state: string;
    url: string;
    votes: string;

    isChecked: boolean;
    Location: string;
    imageUrl: string;
    stakeDays: number;
    stakeuntil: number;
    stakeuntilDate: string;
    stakeuntilExpiredIn: string;
    stakeuntilAboutExpire: string;
    userVotes: number;
    userStakeDays: number;
}

export type ProducersSearchResponse = {
  producers: DPoS2Node[],
  totaldposv2votes: string,
  totalvotes: string,
  totalcounts: number,
}

// data for https://node1.elaphant.app/api/
// export class DPoS2Node {
//   constructor(
//     public Producer_public_key: string,
//     public Value: string,
//     public Address: string,
//     public Rank: number,
//     public Ownerpublickey: string,
//     public Nodepublickey: string,
//     public Nickname: string,
//     public Url: string,
//     public Location: any,
//     public Active: boolean,
//     public Votes: string,
//     public Netaddress: string,
//     public State: string,
//     public Registerheight: number,
//     public Cancelheight: number,
//     public Inactiveheight: number,
//     public Illegalheight: number,
//     public Index: number,
//     public Reward: string,
//     public EstRewardPerYear: string,
//     public imageUrl: string,
//     public isChecked: boolean
//   ) {}
// }
