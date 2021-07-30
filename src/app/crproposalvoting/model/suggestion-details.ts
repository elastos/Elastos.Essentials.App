export class SuggestionDetails {
    id: number;         // Unique id on CR website
    title: string;      // Title
    did: string;        // ?
    didName; string;    // ?
    abs: string;        // Main suggestion description text
    address: string;    // ?
    createdAt: number;  // Timestamp
    targetProposalTitle: string;
    newOwnerDID?: string;
    newAddress?: string;
    targetProposalHash: string;
    type: string;
}
