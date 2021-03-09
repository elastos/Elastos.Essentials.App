import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { StorageDApp } from '../../model/storagedapp.model';
import { DAppService } from '../../services/dapp.service';

@Component({
  selector: 'app-delete',
  templateUrl: './delete.component.html',
  styleUrls: ['./delete.component.scss'],
})
export class DeleteComponent implements OnInit {

  @Output() cancelEvent = new EventEmitter<boolean>();

  app: StorageDApp;

  constructor(
    private navParams: NavParams,
    private popover: PopoverController,
    public dAppService: DAppService
  ) { }

  ngOnInit() {
    this.app = this.navParams.get('app');
    Logger.log("developertools", 'Delete Warning for ', this.app);
  }

  cancel() {
    this.popover.dismiss();
  }

}
