import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { UXService } from '../../services/ux.service';
import { Native } from '../../services/native';

@Component({
    selector: 'header-bar',
    templateUrl: './header-bar.component.html',
    styleUrls: ['./header-bar.component.scss'],
})
export class HeaderBarComponent implements OnInit {
    public back_touched = false;

    @Input('title') title: string = "";
    @Input('showBack') showBack: boolean = false;
    @Input('backColor') backColor: string = "000000";
    @Input('showClose') showClose: boolean = true;
    @Input('showMenu') showMenu: boolean = false;
    @Input('transparent') transparent: boolean = false;
    @Output('onClose') onClose = new EventEmitter();

    constructor(public uxService: UXService, private native: Native) { }

    ngOnInit() { }

    close() {
        // Call custom close callback if any provided, otherwise directly close the app.
        if (this.onClose.observers.length > 0)
            this.onClose.emit();
        else
            this.uxService.close()
    }

    navBack() {
        this.native.pop();
    }
}
