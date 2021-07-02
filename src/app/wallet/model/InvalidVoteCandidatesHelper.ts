
import { CRProposalStatus } from './cyber-republic/CRProposalStatus';
import { VoteType, VoteContent, Candidates } from './SPVWalletPluginBridge';
import { Logger } from 'src/app/logger';
import { WalletJsonRPCService } from '../services/jsonrpc.service';

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
    constructor(private jsonRPCService: WalletJsonRPCService) {}

    public async removeInvalidCandidates(votingContent:VoteContent[], oldVotedContent:VoteContent[]): Promise<VoteContent[]> {
        let newVoteContents: VoteContent[] = [];

        let crcinvoting = await this.isCRCInVoting();

        for (let i = 0, len = oldVotedContent.length; i < len; i++) {
          let validContent = true;
          // Replace with new vote content.
          for (let j = 0, lenUserContents = votingContent.length; j < lenUserContents; j++) {
            if (votingContent[j].Type === oldVotedContent[i].Type) {
              validContent = false;
            }
          }

          if (validContent) {
            switch (oldVotedContent[i].Type) {
                case VoteType.CRC:
                  // Remove crc vote content if we are outside of the council voting period.
                  if (!crcinvoting) {
                    validContent = false;
                  }
                  break;
                case VoteType.CRCImpeachment:
                  // Check if a previously voted CR member has been impeached and is not a CR member any more
                  let validImpeachment = await this.computeValidCRCImpeachment(oldVotedContent[i].Candidates);
                  if (validImpeachment && Object.keys(validImpeachment).length > 0) {
                    oldVotedContent[i].Candidates = validImpeachment;
                  } else {
                    validContent = false;
                  }
                  break;
                case VoteType.CRCProposal:
                  // Check if some previously voted proposals are not in NOTIFICATION state any more
                  let validProposals = await this.computeValidProposals(oldVotedContent[i].Candidates);
                  if (validProposals && Object.keys(validProposals).length > 0) {
                    oldVotedContent[i].Candidates = validProposals;
                  } else {
                    validContent = false;
                  }
                  break;
                case VoteType.Delegate:
                  // Check if some previously voted dpos nodes are now inactive.
                  let validDposNodes = await this.computeValidDposnodes(oldVotedContent[i].Candidates);
                  if (validDposNodes && Object.keys(validDposNodes).length > 0) {
                    oldVotedContent[i].Candidates = validDposNodes;
                  } else {
                    validContent = false;
                  }
                  break;
                default:
                  Logger.warn('wallet', 'Do not support this voting:', oldVotedContent[i].Type);
                  break;
            }
          }

          if (validContent) {
            newVoteContents.push(oldVotedContent[i]);
          }
        }

        newVoteContents.push.apply(newVoteContents, votingContent);
        return newVoteContents;
    }

    /**
     * If we are outside of the council voting period.
     */
    private async isCRCInVoting() {
      let crrelatedStage = await this.jsonRPCService.getCRrelatedStage();
      if (crrelatedStage) {
        return crrelatedStage.invoting;
      }
      return null;
    }

    private async computeValidCRCImpeachment(crImpeachmentCandidates: Candidates): Promise<Candidates> {
      let validCRImpeachmentCandidates: Candidates = {};

      try {
        let councilList = await this.jsonRPCService.fetchCRcouncil();
        if (!councilList) {
          return null;
        }
        Logger.warn('wallet', 'council list:', councilList)

        for (let councilDid in crImpeachmentCandidates) {
          Logger.log('wallet', "Checking vote for CR Impeachment invalidity:", councilDid);

          let matching = councilList.data.council.find((currentlyCouncil)=>{
              return currentlyCouncil.did === councilDid;
          });

          // TODO Remove it If the vote is from the last term.

          if (!matching) {
              // Previously voted dops node is not in active state any more. Don't add it.
              Logger.log('wallet', "Previous vote added to invalid proposals list");
          }
          else {
              // Previously voted proposals is still in active state. Add it.
              validCRImpeachmentCandidates[councilDid] = crImpeachmentCandidates[councilDid];
              Logger.log('wallet', "Previous vote still in notification state, doing nothing");
          }
        }
        Logger.warn('wallet', 'valid CR Impeachment Candidates:', validCRImpeachmentCandidates)
        return validCRImpeachmentCandidates;
      }
      catch (err) {
        Logger.error('wallet', 'computeValidDposnodes error:', err);
      }
      return null;
    }

    private async computeValidDposnodes(dposNodeCandidates: Candidates): Promise<Candidates> {
      let validDposNodes: Candidates = {};

      try {
        let dposnodes = await this.jsonRPCService.fetchDposNodes('active');
        if (!dposnodes) {
          return null;
        }
        Logger.warn('wallet', 'dpos nodes:', dposnodes)

        for (let dposnode in dposNodeCandidates) {
          Logger.log('wallet', "Checking vote for DPOS voting invalidity:", dposnode);

          let matchingProposal = dposnodes.producers.find((currentlyDposnode)=>{
              return currentlyDposnode.ownerpublickey === dposnode;
              // return currentlyDposnode.nodepublickey === dposnode;
          });

          if (!matchingProposal) {
              // Previously voted dops node is not in active state any more. Don't add it.
              Logger.log('wallet', "Previous vote added to invalid dpos node list");
          }
          else {
              // Previously voted proposals is still in active state. Add it.
              validDposNodes[dposnode] = dposNodeCandidates[dposnode];
          }
        }
        Logger.warn('wallet', 'valid Dpos Voting:', validDposNodes)
        return validDposNodes;
      }
      catch (err) {
        Logger.error('wallet', 'computeValidDposnodes error:', err);
      }
      return null;
    }

    private async computeValidProposals(proposalsCandidates: Candidates): Promise<Candidates> {
      let validProposals: Candidates = {};

      Logger.log('wallet', "proposalsCandidates", proposalsCandidates);

      // Fetch all proposals currently in NOTIFICATION state.
      try {
          let proposalsInNotificationState = await this.jsonRPCService.fetchProposals(CRProposalStatus.NOTIFICATION);
          if (!proposalsInNotificationState) {
              return null;
          }

          // - For each proposal voted earlier, found in getVoteInfo():
          //      - All proposal not in the NOTIFICATION state any more should be considered invalid therefore
          //      be added to our list of invalid proposals, so the spv sdk can cleanup stuff.

          for (let votedProposalHash in proposalsCandidates) {
              Logger.log('wallet', "Checking vote for CR proposal invalidity:", votedProposalHash);

              // Try to find this vote in the proposals currently in notificaion state on the CR website
              // Should have exactly one vote entry.
              let matchingProposal = proposalsInNotificationState.data.list.find((proposalCurrentlyInNotification)=>{
                  return proposalCurrentlyInNotification.proposalHash === votedProposalHash;
              });

              if (!matchingProposal) {
                  // Previously voted proposals is not in notification state any more. Don't add it.
                  Logger.log('wallet', "Previous vote added to invalid proposals list");
              }
              else {
                  // Previously voted proposals is still in notification state. Add it.
                  validProposals[votedProposalHash] = proposalsCandidates[votedProposalHash];
                  Logger.log('wallet', "Previous vote still in notification state, doing nothing");
              }
          }
          Logger.warn('wallet', 'validProposals:', validProposals)
          return validProposals;
      }
      catch (err) {
          Logger.error('wallet', 'computeValidProposals error', err);
          return null;
      }
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

}
