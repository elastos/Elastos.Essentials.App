import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
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

  public app: StorageDApp;

  constructor(
    private navParams: NavParams,
    private popover: PopoverController,
    public dAppService: DAppService,
    public translate: TranslateService
  ) { }

  ngOnInit() {
    this.app = this.navParams.get('app');
    Logger.log("developertools", 'Delete Warning for ', this.app);
  }

  cancel() {
    void this.popover.dismiss();
  }

  delete() {
    void this.popover.dismiss({ delete: true });
  }
}
