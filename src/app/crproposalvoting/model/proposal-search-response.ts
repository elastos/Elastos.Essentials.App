import { ProposalSearchResult } from "./proposal-search-result";

export type ProposalsSearchResponse = {
    code: number, // whether the api succeeded or not. 1 means ok.
    data: {
        list: ProposalSearchResult[],
        total: number; // Total number of available results for this query
    },
    message: string; // Ex: "ok"
}