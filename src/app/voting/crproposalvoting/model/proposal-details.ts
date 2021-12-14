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
    name: string; // Display name of the voting council member
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
    status: ProposalStatus;
    abstract: string; // Abstract = detailed proposal description
    crVotes: VoteResult[];
    originalURL: string; // Cyber Republic web page URL where the full proposal content can be seen
    duration: string; // ?
    rejectAmount: string; // ?
    rejectThroughAmount: string; // ?
    rejectRatio: number; // ?
    tracking: Tracking[] // ?
    title: string;
    createdAt: number;
    type: string;
    draftHash: string;
    motivation: string;
    goal: string;
    milestone: any;
    implementationTeam: any;
    planStatement: string;
    budgets: any;
    budgetStatement: string;
    recipient: string;
}
