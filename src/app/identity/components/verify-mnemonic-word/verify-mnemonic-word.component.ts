import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'verify-mnemonic-word',
    templateUrl: './verify-mnemonic-word.component.html',
    styleUrls: ['./verify-mnemonic-word.component.scss'],
})
export class VerifyMnemonicWordComponent implements OnInit {
    @Input('index') index: number = 0;
    @Input('word') word: string = null;

    constructor() { 
    }

    ngOnInit() { }

    isWordSet() {
        return this.word != "" && this.word != null;
    }
}
