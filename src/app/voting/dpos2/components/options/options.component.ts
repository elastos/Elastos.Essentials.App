import { Component } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

export enum NodesSortType {
  VotesDec = 0,
  VotesInc = 1,
  CreationDateDec = 2,
  CreationDateInc = 3,
  NameInc = 4,
  NameDec = 5,
  StakeUntilInc = 6,
  StakeUntilDec = 7
}

export enum NodesActionType {
  Register = 0,
  Detail = 1,
  Withdraw = 2,
  CheckDPoSStatus = 3,
}

@Component({
  selector: 'app-options',
  templateUrl: './options.component.html',
  styleUrls: ['./options.component.scss'],
})
export class OptionsComponent {
  public options = null;

  constructor(
    public theme: GlobalThemeService,
    private popoverCtrl: PopoverController,
    private navParams: NavParams,
    private translate: TranslateService,
  ) { }

  ngOnInit() {
    this.options = this.navParams.get('options');
  }

  ionViewWillLeave() {
    void this.popoverCtrl.dismiss();
  }

  async selectSortType(type: NodesSortType) {
    await this.popoverCtrl.dismiss(type);
  }
}
