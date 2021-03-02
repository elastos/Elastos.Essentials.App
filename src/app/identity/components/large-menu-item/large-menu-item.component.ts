import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'large-menu-item',
    templateUrl: './large-menu-item.component.html',
    styleUrls: ['./large-menu-item.component.scss'],
})
export class LargeMenuItemComponent implements OnInit {
    @Input('title') title: string = "";
    @Input('mode') mode: string = "default";

    constructor() {
    }

    ngOnInit() { }
}
