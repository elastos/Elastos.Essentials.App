import { HttpClient, HttpHeaders } from '@angular/common/http';

import { WalletManagerPage } from '../pages/wallet/wallet-manager/wallet-manager.page';
import { WalletManager } from '../services/wallet.service';
import { StandardCoinName } from './Coin';
import { CRProposalStatus } from './cyber-republic/CRProposalStatus';
import { CRProposalsSearchResponse } from './cyber-republic/CRProposalsSearchResponse';
import { VoteType, CRProposalVoteInfo } from './SPVWalletPluginBridge';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { NetworkType } from 'src/app/model/networktype';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { Logger } from 'src/app/logger';

type InvalidCRCCandidate = string;
type InvalidDelegateCandidate = string;
type InvalidCRCImpeachmentCandidate = string;
type InvalidCRCProposalCandidate = string;

/**
 * Example:
    {
        "Type":"CRC",
        "Candidates":[ "cid", ...]
    },
    {
        "Type":"Delegate",
        "Candidates":[ "pubkey", ...]
    },
    {
        "Type":"CRCImpeachment",
        "Candidates":[ "cid", ...]
    }
 */
export type InvalidCandidateForVote = {
    Type: VoteType,
    Candidates: InvalidCRCCandidate[] | InvalidDelegateCandidate[] | InvalidCRCImpeachmentCandidate[] | InvalidCRCProposalCandidate[]
}

/**
 * Helper class to computer the list of previous votes that are now invalid. It's important to give a list
 * of invalid candidates to the SPV API so it can cleanup those now-wrong previous votes when merging our new
 * vote with previous vote types. Otherwise, the published transaction will be invalid, if we pass invalid candidates.
 */
export class InvalidVoteCandidatesHelper {
    constructor(private http: HttpClient, private walletManager: WalletManager, private masterWalletId: string, private prefs: GlobalPreferencesService) {}

    public async computeInvalidCandidates(): Promise<InvalidCandidateForVote[]> {
        let invalidCandidatesList: InvalidCandidateForVote[] = [];

        // Check if some previously voted dpos nodes are now invalid
        // TODO

        // Check if some previously voted proposals are not in NOTIFICATION state any more
        let invalidProposals = await this.computeInvalidProposals();
        Logger.log('wallet', "invalidProposals", invalidProposals);
        if (invalidProposals)
            invalidCandidatesList.push(invalidProposals);

        // Check if a previously voted CR member has been impeached and is not a CR member any more
        // TODO

        // Check if we are outside of the council voting period.
        // TODO

        return invalidCandidatesList;
    }

    /*
    ORIGINAL CODE FROM THE ELA WALLET:

    public JSONArray conversUnactiveVote(String remove, String voteInfo, List<VoteListBean.DataBean.ResultBean.ProducersBean> depositList,
                                         List<CRListBean.DataBean.ResultBean.CrcandidatesinfoBean> crcList, List<ProposalSearchEntity.DataBean.ListBean> voteList, List<CtListBean.Council> councilList) {
        JSONArray otherUnActiveVote = new JSONArray();

        if (!TextUtils.isEmpty(voteInfo) && !voteInfo.equals("null") && !voteInfo.equals("[]")) {

            try {
                JSONArray lastVoteInfo = new JSONArray(voteInfo);
                for (int i = 0; i < lastVoteInfo.length(); i++) {
                    JSONObject jsonObject = lastVoteInfo.getJSONObject(i);
                    String type = jsonObject.getString("Type");

                    if (type.equals(remove)) {
                        continue;
                    }
                    JSONObject votes = jsonObject.getJSONObject("Votes");
                    Iterator it = votes.keys();
                    JSONArray candidates = new JSONArray();
                    switch (type) {
                        case "Delegate":
                            while (it.hasNext()) {
                                String key = (String) it.next();
                                if (depositList == null || depositList.size() == 0) {
                                    candidates.put(key);
                                    continue;
                                }
                                for (VoteListBean.DataBean.ResultBean.ProducersBean bean : depositList) {
                                    if (bean.getOwnerpublickey().equals(key) && !bean.getState().equals("Active")) {
                                        candidates.put(key);
                                        break;
                                    }
                                }
                            }

                            break;
                        case "CRC":
                            while (it.hasNext()) {
                                String key = (String) it.next();
                                if (crcList == null || crcList.size() == 0) {
                                    candidates.put(key);
                                    continue;
                                }
                                for (CRListBean.DataBean.ResultBean.CrcandidatesinfoBean bean : crcList) {
                                    if (bean.getDid().equals(key) && !bean.getState().equals("Active")) {
                                        candidates.put(key);
                                        break;
                                    }
                                }
                            }

                            break;
                        case "CRCImpeachment"://弹劾
                            while (it.hasNext()) {
                                String key = (String) it.next();
                                if (councilList == null || councilList.size() == 0) {
                                    candidates.put(key);
                                    continue;
                                }
                                for (CtListBean.Council bean : councilList) {
                                    if (bean.getDid().equals(key) && !bean.getStatus().equals("Elected")) {
                                        candidates.put(key);
                                        break;
                                    }
                                }
                            }
                            break;
                        case "CRCProposal":
                            while (it.hasNext()) {
                                String key = (String) it.next();
                                if (crcList == null || crcList.size() == 0) {
                                    candidates.put(key);
                                    continue;
                                }
                                for (ProposalSearchEntity.DataBean.ListBean bean : voteList) {
                                    if (bean.getProposalHash().equals(key) && !bean.getStatus().equals("NOTIFICATION")) {
                                        candidates.put(key);
                                        break;
                                    }
                                }
                            }
                            break;


                    }
                    otherUnActiveVote.put(getActiveJson(type, candidates));
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }

        }
        return otherUnActiveVote;
    }
    */

    private async computeInvalidProposals(): Promise<InvalidCandidateForVote> {
        let invalidProposals: InvalidCRCProposalCandidate[] = [];

        // Retrieve previous vote info
        let previousVoteInfo = await this.walletManager.spvBridge.getVoteInfo(this.masterWalletId, StandardCoinName.ELA, VoteType.CRCProposal) as CRProposalVoteInfo[];
        Logger.log('wallet', "previousVoteInfo", previousVoteInfo);

        // Fetch all proposals currently in NOTIFICATION state.
        try {
            let proposalsInNotificationState = await this.fetchProposals(CRProposalStatus.NOTIFICATION);
            if (!proposalsInNotificationState) {
                return null;
            }

            // - For each proposal voted earlier, found in getVoteInfo():
            //      - All proposal not in the NOTIFICATION state any more should be considered invalid therefore
            //      be added to our list of invalid proposals, so the spv sdk can cleanup stuff.
            for (let previousVote of previousVoteInfo) {
                Logger.log('wallet', "Checking vote for CR proposal invalidity:", previousVote);

                // Try to find this vote in the proposals currently in notificaion state on the CR website
                if (previousVote.Type == VoteType.CRCProposal) {
                    // Should have exactly one vote entry.
                    if (Object.keys(previousVote.Votes).length == 1) {
                        let votedProposalHash = Object.keys(previousVote.Votes)[0];

                        let matchingProposal = proposalsInNotificationState.data.list.find((proposalCurrentlyInNotification)=>{
                            return proposalCurrentlyInNotification.proposalHash === votedProposalHash;
                        });

                        if (!matchingProposal) {
                            // Previously voted proposals is not in notification state any more. Make it invalid
                            invalidProposals.push(votedProposalHash);
                            Logger.log('wallet', "Previous vote added to invalid proposals list");
                        }
                        else {
                            // Previously voted proposals is still in notification state. Do nothing.
                            Logger.log('wallet', "Previous vote still in notification state, doing nothing");
                        }
                    }
                }
            }

            return {
                Type: VoteType.CRCProposal,
                Candidates: invalidProposals
            }
        }
        catch (err) {
            Logger.error('wallet', err);
            return null;
        }
    }

    private async fetchProposals(status: CRProposalStatus): Promise<CRProposalsSearchResponse> {
        // Check which network we are currently configured for.
        let networkType = await this.prefs.getActiveNetworkType(GlobalDIDSessionsService.signedInDIDString);
        let crApiUrl: string = "";
        switch (networkType) {
            case NetworkType.MainNet:
                crApiUrl = "https://api.cyberrepublic.org";
                break;
            case NetworkType.TestNet:
                crApiUrl = null; // TODO
                break;
            case NetworkType.RegNet:
                crApiUrl = null; // TODO
                break;
            case NetworkType.PrvNet:
                crApiUrl = "http://crapi.longrunweather.com:18080";
                break;
        }

        if (!crApiUrl) {
            Logger.error('wallet', "No CR API defined for network type "+networkType+"!");
            return null;
        }

        return new Promise((resolve, reject)=>{
            Logger.log('wallet', 'Fetching proposals...');
            this.http.get<any>(crApiUrl+'/api/cvote/all_search?status='+status+'&page=1&results=-1').subscribe((res: CRProposalsSearchResponse) => {
                Logger.log('wallet', res);
                resolve(res);
            }, (err) => {
                Logger.error('wallet', err);
                reject(err);
            });
        });
    }
}