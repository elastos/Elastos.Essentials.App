import { ELANode } from "src/app/wallet/model/elastos.types";

export type DPoS2Node =  ELANode & {
    checkDisabled: boolean;
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
    dposv2votesNumber: number;
    votesPercentage: number;
}
