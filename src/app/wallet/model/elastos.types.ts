
export enum VoteType {
    CRC = "CRC",
    Delegate = "Delegate",
    CRCImpeachment = "CRCImpeachment",
    CRCProposal = "CRCProposal"
}

export type PubKeyInfo = {
    derivationStrategy: "BIP44" | "BIP45";
    m: number; // number of total co-signers - 1 for standard wallets (unused)
    n: number; // number of required signers - 1 for standard wallets (unused)
    publicKeyRing: string[]; // Array of xPubKeyHDPM
    xPubKey: string; // eg: "xpub6D7Q8"
    xPubKeyHDPM: string; // eg: "xpub68VWD"
}

/** details:
*  [{
*      "Type": "Delegate",
*      "Amount": "200000000",
*      "Timestamp": 1560888482,
*      "Expiry": null,
*      "Votes": {"02848A8F1880408C4186ED31768331BC9296E1B0C3EC7AE6F11E9069B16013A9C5": "10000000","02775B47CCB0808BA70EA16800385DBA2737FDA090BB0EBAE948DD16FF658CA74D": "200000000"}
*  },
*  {
*      ...
*  }]
* or:
*  [{
*      "Type": "CRC",
*      "Amount": "300000000",
*      "Timestamp": 1560888482,
*      "Expiry": null,
*      "Votes": {"iYMVuGs1FscpgmghSzg243R6PzPiszrgj7": "10000000","iT42VNGXNUeqJ5yP4iGrqja6qhSEdSQmeP": "200000000"}
*  },
*  {*/

export type VoteInfo = {
    Type: VoteType,
    Amount: string, // Amount in sELA
    Timestamp: number, // Unix timestamp (secs)
    Expiry: number, // Unix timestamp (secs). Can be null.
};

export type CRProposalVoteInfo = VoteInfo & {
    Votes: {
        [proposalHash: string]: string // "proposalHash": "sELAVoteAmount"
    }
};

export type Candidates = {
    [k: string]: string // "iYMVuGs1FscpgmghSzg243R6PzPiszrgj7": "100000000",
};

export type VoteContent = {
    Type: VoteType,
    Candidates: Candidates,
};
