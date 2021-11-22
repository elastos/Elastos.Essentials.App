import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ProposalSearchResult } from '../../model/proposal-search-result';
import { ProposalService } from '../../services/proposal.service';

@Component({
    selector: 'proposal-search-result',
    templateUrl: './proposal-search-result.component.html',
    styleUrls: ['./proposal-search-result.component.scss'],
})
export class ProposalSearchResultComponent implements OnInit {
    @Input('proposal') proposal: ProposalSearchResult = null;
   
    constructor(private proposalService: ProposalService) { }

    ngOnInit() { }

    selectProposal(proposal: ProposalSearchResult) {
        this.proposalService.navigateToProposalDetailsPage(proposal);
    }
}
