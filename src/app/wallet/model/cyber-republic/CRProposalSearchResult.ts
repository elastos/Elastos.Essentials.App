import { CRProposalStatus } from "./CRProposalStatus";

export type CRProposalSearchResult = {
    createdAt: number; // timestamp
    id: number;
    proposalHash: string; // Ex: "9ba......"
    proposedBy: string; // Ex: "Firstname lastname"
    status: CRProposalStatus; // Ex: "VOTING"
    title: string; // Ex: "Proposal to do this or that"
}
