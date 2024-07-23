import { ProposalStatus } from "./proposal-status";

export enum VoteResultType {
    APPROVE = "approve",
    REJECT = "reject",
    ABSTAIN = "abstain"
}

export class VoteResult {
    result: VoteResultType;
    opinion: string; // Council member comment for his vote choice
    avatar?: string; // Url of the council member who sent this result, if any
    name?: string; // Display name of the voting council member, without name if the name is not set or made public for the DID
}

export class TrackingComment {
    content: string; // ?
    opinion: string; // ?
    avatar: string; // ?
    createdBy: string; // ?
    createdAt: number; // Timestamp
}

export class Tracking {
    comment: TrackingComment;
    didName: string; // ?
    avatar: string; // ?
    stage: number; // ?
    content: string; // ?
    createdAt: number; // Timestamp
}

export class ProposalDetails {
    id: number;
    title: string;
    status: ProposalStatus;
    type: string;
    createdAt: number;
    proposer: string;
    did: string;
    proposalHash: string;
    abstract: string; // Abstract = detailed proposal description
    motivation: string;
    goal: string;
    milestone: any;
    implementationTeam: any;
    planStatement: string;
    recipient: string;
    budgetStatement: string;

    crVotes: VoteResult[];
    originalURL: string; // Cyber Republic web page URL where the full proposal content can be seen
    duration: string; // ?
    rejectAmount: string; // ?
    rejectThroughAmount: string; // ?
    rejectRatio: number; // ?

    targetProposalID: string;
    targetProposalTitle: string;

    newOwnerDID?: string;
    newRecipient?: string;
    newSecretaryDID?: string;
    closeProposalID?: string;

    reservedCustomizedIDList?: [string];
    receivedCustomizedIDList?: [string];
    receiverDID?: string;
    rateOfCustomizedIDFee?: number;
    EIDEffectiveHeight?: number;

    budgets: any;

    //SideChain Info
    sideChainName?: string;
    magicNumber?: number;
    genesisHash?: string;
    exchangeRate?: number;
    effectiveHeight?: number;
    resourcePath?: string;
    otherInfo?: string;
}
