import { ProposalStatus } from "./proposal-status";

export type ProposalSearchResult = {
    createdAt: number; // timestamp
    id: number;
    proposalHash: string; // Ex: "9ba......"
    proposedBy: string; // Ex: "Firstname lastname"
    status: ProposalStatus; // Ex: "VOTING"
    title: string; // Ex: "Proposal to do this or that"
}
