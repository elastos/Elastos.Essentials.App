import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { UXService } from '../../services/ux.service';

@Component({
    selector: 'header-menu-button',
    templateUrl: './header-menu-button.component.html',
    styleUrls: ['./header-menu-button.component.scss'],
})
export class HeaderMenuButtonComponent implements OnInit {
    //@Input('transparent') transparent: boolean = false;
    // @Output('onMenu') onMenu = new EventEmitter();

    constructor(public uxService: UXService) { }

    ngOnInit() { }

    close() {
        this.uxService.close()
    }
}
