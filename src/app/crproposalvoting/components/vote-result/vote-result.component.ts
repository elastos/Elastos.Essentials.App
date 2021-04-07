import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { VoteResult } from '../../model/proposal-details';

@Component({
    selector: 'vote-result',
    templateUrl: './vote-result.component.html',
    styleUrls: ['./vote-result.component.scss'],
})
export class VoteResultComponent implements OnInit {
    @Input('vote') vote: VoteResult = null;
   
    constructor(public theme: GlobalThemeService) { }

    ngOnInit() { }
}
