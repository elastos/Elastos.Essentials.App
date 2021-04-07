import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss'],
})
export class HelpComponent implements OnInit {

  @Output() cancelEvent = new EventEmitter<boolean>();

  message: string;

  constructor(
    private navParams: NavParams,
    public translate: TranslateService
  ) { }

  ngOnInit() {
    this.message = this.translate.instant(this.navParams.get('message'));
  }
}
