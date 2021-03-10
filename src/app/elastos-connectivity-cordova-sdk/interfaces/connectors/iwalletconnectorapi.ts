export interface IWalletConnectorAPI {
    pay(): Promise<void>;
    voteForDPoS(): Promise<void>;
    voteForCRCouncil(): Promise<void>;
    voteForCRProposal(): Promise<void>;
    sendSmartContractTransaction(payload: any): Promise<string>; // TODO: refine what this "payload" is and if that's specific to the web3 library or not
}