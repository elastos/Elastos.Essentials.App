import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { AuthService } from '../../services/auth.service';
import { DIDService } from '../../services/did.service';
import { Native } from '../../services/native';
import { ProfileService } from '../../services/profile.service';

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
    void this.popover.dismiss();
  }

  showWarning(warning: string) {
    void this.popover.dismiss();
    void this.profileService.showWarning(warning, null);
  }

  async exportMnemonic() {
    void this.popover.dismiss();
    await this.authService.checkPasswordThenExecute(async () => {
      let mnemonics = await this.didService.activeDidStore.exportMnemonic(AuthService.instance.getCurrentUserPassword());
      void this.native.go('/identity/exportmnemonic', { mnemonics: mnemonics });
    }, () => {
      // Operation cancelled
      Logger.log('Identity', "Password operation cancelled");
    },
      true, true)
  }
}
