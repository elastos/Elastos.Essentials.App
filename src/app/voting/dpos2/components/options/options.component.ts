import { Component } from '@angular/core';
import { PopoverController } from '@ionic/angular';
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

@Component({
  selector: 'app-options',
  templateUrl: './options.component.html',
  styleUrls: ['./options.component.scss'],
})
export class OptionsComponent {
  public options = [
    {
      type: NodesSortType.VotesDec,
      title: this.translate.instant("dposvoting.sort-votes-dec"),
    },
    {
      type: NodesSortType.VotesInc,
      title: this.translate.instant("dposvoting.sort-votes-inc"),
    },
    {
      type: NodesSortType.CreationDateDec,
      title: this.translate.instant("dposvoting.sort-creation-date-dec"),
    },
    {
      type: NodesSortType.CreationDateInc,
      title: this.translate.instant("dposvoting.sort-creation-date-inc"),
    },
    {
      type: NodesSortType.NameDec,
      title: this.translate.instant("dposvoting.sort-name-dec"),
    },
    {
      type: NodesSortType.NameInc,
      title: this.translate.instant("dposvoting.sort-name-inc"),
    },
    {
      type: NodesSortType.StakeUntilDec,
      title: this.translate.instant("dposvoting.sort-stake-until-dec"),
    },
    {
      type: NodesSortType.StakeUntilInc,
      title: this.translate.instant("dposvoting.sort-stake-until-inc"),
    },
  ];

  constructor(
    public theme: GlobalThemeService,
    private popoverCtrl: PopoverController,
    private translate: TranslateService,
  ) { }

  async selectSortType(type: NodesSortType) {
    await this.popoverCtrl.dismiss(type);
  }
}
