
export enum VoteTypeString {
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
    Type: VoteTypeString,
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
    Type: VoteTypeString,
    Candidates: Candidates,
};

// Node
export type ELANode = {
  active: boolean;
  cancelheight: number;
  dposv2votes: string;
  identity: string;
  illegalheight: number;
  inactiveheight: number;
  index: number;
  location: number;
  nickname: string;
  nodepublickey: string;
  onduty: string; //'Valid', 'Candidate'
  ownerpublickey: string;
  registerheight: number;
  stakeuntil: number;
  state: string;
  url: string;
  votes: string;
}

export type ProducersSearchResponse = {
    producers: ELANode[],
    totaldposv2votes: string,
    totalvotes: string,
    totalcounts: number,
}

// BPoS
export type VoteDetail = {
    candidates: string,
    votes: string,
    locktime: number,
};

export type DposV2VoteInfo = {
    StakeAddress: string,
    TransactionHash: string,
    BlockHeight: number,
    PayloadVersion: number,
    VoteType: number,
    Info: VoteDetail[]
};

export type StakeInfo = {
    stakeaddress: string,
    totalvotesright: string,
    usedvotesinfo: {
        useddposvotes: VoteDetail[],
        usedcrvotes: VoteDetail[],
        usedcrcproposalvotes: VoteDetail[],
        usdedcrimpeachmentvotes: VoteDetail[],
        useddposv2votes: DposV2VoteInfo[],
    },
    remainvoteright: string[],
};

export enum MintBPoSNFTTxStatus {
  Claimable = "Claimable",
  Claimed = "Claimed",
  Unconfirmed = "Unconfirmed",
}

export type MintBPoSNFTTxInfo = {
  txid: string,
  status: MintBPoSNFTTxStatus,
};