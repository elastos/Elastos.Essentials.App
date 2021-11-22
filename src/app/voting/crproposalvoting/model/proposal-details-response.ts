import { ProposalSearchResult } from "./proposal-search-result";
import { ProposalDetails } from "./proposal-details";

export type ProposalsDetailsResponse = {
    code: number, // whether the api succeeded or not. 1 means ok.
    data: ProposalDetails,
    message: string // Ex: "ok"
}