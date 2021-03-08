import { SuggestionDetails } from "./suggestion-details";

export type SuggestionDetailsResponse = {
    code: number, // whether the api succeeded or not. 1 means ok.
    data: SuggestionDetails,
    message: string // Ex: "ok"
}