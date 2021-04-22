export type ClientMeta = {
    description: string;
    url: string;
    icons: string[];
    name: string;
}

export type WalletConnectSession = {
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