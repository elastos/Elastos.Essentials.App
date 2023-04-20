import { ELANode } from "src/app/wallet/model/elastos.types";

export type DPosNode = ELANode & {
    Location: string;
    Reward: string;
    EstRewardPerYear: string;
    imageUrl: string;
    isChecked: boolean;
}

// data for https://node1.elaphant.app/api/
// export class DPosNode {
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
