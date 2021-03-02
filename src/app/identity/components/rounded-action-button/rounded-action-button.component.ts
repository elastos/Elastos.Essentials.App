import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'rounded-action-button',
    templateUrl: './rounded-action-button.component.html',
    styleUrls: ['./rounded-action-button.component.scss'],
})
export class RoundedActionButtonComponent implements OnInit {
    @Input('title') title: string = "";
    @Input('color') color: string = "#FAFAFA";
    @Input('imgcolor') imgcolor: string = "#FFFFFF";
    @Input('mode') mode: string = "primary";
    @Input('image') image: string = null;

    constructor() {
    }

    ngOnInit() { }
}
