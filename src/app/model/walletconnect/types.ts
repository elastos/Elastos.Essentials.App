import { ProposalTypes, SignClientTypes } from "@walletconnect/types";

export type ClientMeta = {
    description: string;
    url: string;
    icons: string[];
    name: string;
}

export type WalletConnectSession = {
    // Default wallet connect information
    connected: boolean;
    accounts: string[];
    chainId: number;
    bridge: string;
    key: string;
    clientId: string;
    clientMeta: ClientMeta | null;
    peerId: string;
    peerMeta: ClientMeta | null;
    handshakeId: number;
    handshakeTopic: string;
};

export type WalletConnectSessionExtension = {
    // Information added by Essentials
    timestamp?: number; // Date at which the session was created
}

// V1
export type SessionRequestParams = {
    chainId: number | null;
    peerId: string | null;
    peerMeta: ClientMeta | null;
}

export type JsonRpcRequest = {
    id: number;
    jsonrpc: string;
    method: string;
    params: any[];
}

/******* WALLET CONNECT V2 TYPES */

export type SessionProposalEvent = Omit<SignClientTypes.BaseEventArgs<ProposalTypes.Struct>, "topic">;
export type SessionRequestEvent = SignClientTypes.BaseEventArgs<{ request: { method: string; params: any; }; chainId: string; }>;