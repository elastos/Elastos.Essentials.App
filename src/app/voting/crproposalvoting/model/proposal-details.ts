import { ProposalStatus } from "./proposal-status";

export enum VoteResultType {
    SUPPORT = "support",
    REJECT = "reject",
    ABSTENTION = "abstention"
}

export class VoteResult {
    value: VoteResultType;
    reason: string; // Council member comment for his vote choice
    avatar?: string; // Url of the council member who sent this result, if any
    votedBy: string; // Display name of the voting council member
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
    abs: string; // Abstract = detailed proposal description
    voteResult: VoteResult[];
    address: string; // Cyber Republic web page URL where the full proposal content can be seen
    duration: string; // ?
    rejectAmount: string; // ?
    rejectThroughAmount: string; // ?
    rejectRatio: number; // ?
    tracking: Tracking[] // ?
    title: string;
    createdAt: number;
}