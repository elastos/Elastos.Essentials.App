

export enum SuggestionStatus {
    ALL = "all",
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
    sid?: string;   //Suggestion id
    title: string;      // Title
    status: string;
    did: string;
    proposer: string;
    ownerPublicKey: string;
    abstract: string;        // Main suggestion description text
    originalURL: string;
    createdAt: number;  // Timestamp
    motivation: string;
    goal: string;

    milestone: any;
    implementationTeam: any;
    planStatement: string;
    recipient: string;
    budgets: any;
    budgetStatement: string;

    targetProposalNum: number;
    targetProposalTitle: string;
    targetProposalHash: string;

    newOwnerDID?: string;
    newRecipient?: string;
    newSecretaryDID?: string;
    newSecretaryPublicKey?: string;
    newSecretarySignature?: string;

    type: string;
    draftHash: string;

    signature?: string;
    secretaryGeneralSignature?: string;
    newOwnerSignature?: string;

    reservedCustomizedIDList?: [string];
    receivedCustomizedIDList?: [string];
    receiverDID?: string;
    rateOfCustomizedIDFee?: number;
    EIDEffectiveHeight?: number;

    //SideChain Info
    sideChainName?: string;
    magicNumber?: number;
    genesisHash?: string;
    exchangeRate?: number;
    effectiveHeight?: number;
    resourcePath?: string;
    otherInfo?: string;
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
