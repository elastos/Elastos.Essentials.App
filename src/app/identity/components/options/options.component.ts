import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { PopoverController, NavParams } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { ProfileService } from '../../services/profile.service';
import { DIDService } from '../../services/did.service';
import { AuthService } from '../../services/auth.service';
import { Native } from '../../services/native';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Logger } from 'src/app/logger';

@Component({
  selector: 'app-options',
  templateUrl: './options.component.html',
  styleUrls: ['./options.component.scss'],
})
export class OptionsComponent implements OnInit {

  @Output() cancelEvent = new EventEmitter<boolean>();

  options: string = '';

  constructor(
    private popover: PopoverController,
    private navParams: NavParams,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    public profileService: ProfileService,
    public didService: DIDService,
    private authService: AuthService,
    private native: Native
  ) { }

  ngOnInit() {
    this.options = this.navParams.get('options');
    Logger.log('Identity', 'Options ', this.options);
  }

  ionViewWillLeave() {
    this.popover.dismiss();
  }

  showWarning(warning: string) {
    this.popover.dismiss();
    this.profileService.showWarning(warning, null);
  }

  async exportMnemonic() {
    this.popover.dismiss();
    await this.authService.checkPasswordThenExecute(async () => {
      let mnemonics = await this.didService.activeDidStore.exportMnemonic(AuthService.instance.getCurrentUserPassword());
      Logger.log('Identity', 'Mnemonics', mnemonics);
      this.native.go('/identity/exportmnemonic', { mnemonics: mnemonics });
    }, () => {
      // Operation cancelled
      Logger.log('Identity', "Password operation cancelled");
    },
    true, true)
  }
}
