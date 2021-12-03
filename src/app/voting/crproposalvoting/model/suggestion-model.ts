

export enum SuggestionStatus {
    ALL = "ALL",
    SIGNED = "signed",
    UNSIGNED = "unsigned",
    PROPOSED = "proposed",
}

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

export class SuggestionDetail {
    id: number;         // Unique id on CR website
    title: string;      // Title
    did: string;        // ?
    didName; string;    // ?
    abstract: string;        // Main suggestion description text
    address: string;    // ?
    createdAt: number;  // Timestamp
    targetSuggestionTitle: string;
    newOwnerDID?: string;
    newAddress?: string;
    targetSuggestionHash: string;
    targetProposalNum: number;
    type: string;
    draftHash: string;
    motivation: string;
    goal: string;
    milestone: any;
    implementationTeam: any;
    planStatement: string;
    budgets: any;
    budgetStatement: string;
}

export type SuggestionDetailResponse = {
    code: number, // whether the api succeeded or not. 1 means ok.
    data: SuggestionDetail,
    message: string // Ex: "ok"
}

//-----------Search-------------
export type SuggestionSearchResult = {
    sid: string;
    id: number;
    title: string;
    status: SuggestionStatus;
    createdAt: number; // timestamp
    proposedBy: string;
    proposalHash: string;
    type: string;
}

export type SuggestionsSearchResponse = {
    code: number, // whether the api succeeded or not. 1 means ok.
    data: {
        list: SuggestionSearchResult[],
        total: number; // Total number of available results for this query
    },
    message: string; // Ex: "ok"
}
