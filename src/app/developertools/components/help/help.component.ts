import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { NavParams } from '@ionic/angular';
import { Logger } from 'src/app/logger';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss'],
})
export class HelpComponent implements OnInit {

  @Output() cancelEvent = new EventEmitter<boolean>();

  message: string;

  constructor(private navParams: NavParams) { }

  ngOnInit() {
    this.message = this.navParams.get('message');
    Logger.log("developertools", 'Help', this.message);
  }
}
