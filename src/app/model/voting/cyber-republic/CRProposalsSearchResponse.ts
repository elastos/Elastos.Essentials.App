import { CRProposalSearchResult } from "./CRProposalSearchResult";

export type CRProposalsSearchResponse = {
    code: number, // whether the api succeeded or not. 1 means ok.
    data: {
        list: CRProposalSearchResult[],
        total: number; // Total number of available results for this query
    },
    message: string; // Ex: "ok"
}