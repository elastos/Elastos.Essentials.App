import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Native } from '../../services/native';

@Component({
  selector: 'app-exportmnemonic',
  templateUrl: './exportmnemonic.page.html',
  styleUrls: ['./exportmnemonic.page.scss'],
})
export class ExportmnemonicPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public mnemonicList: any;

  constructor(
    private router: Router,
    public translate: TranslateService,
    public theme: GlobalThemeService,
    private native: Native
  ) {
  }

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    if(navigation.extras.state.mnemonics) {
      const mnemonics = navigation.extras.state.mnemonics
      this.mnemonicList = mnemonics.split(/[\u3000\s]+/).map((word) => {
        return word;
      });

      console.log('Mnemonic list', this.mnemonicList);
    }
  }

  return() {
    this.native.go('myprofile');
  }

}
