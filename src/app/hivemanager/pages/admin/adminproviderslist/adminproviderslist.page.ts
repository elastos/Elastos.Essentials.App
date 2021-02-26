import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { NgZone} from '@angular/core';
import * as moment from 'moment';

import { AdminService } from '../../../services/admin.service';
import { ManagedProvider } from '../../../model/managedprovider';
import { TranslateService } from '@ngx-translate/core';

type StorageProvider = {
  name: string,
  vaultAddress: string
}

@Component({
  selector: 'app-adminproviderslist',
  templateUrl: './adminproviderslist.page.html',
  styleUrls: ['./adminproviderslist.page.scss'],
})
export class AdminProvidersListPage implements OnInit {

  public managedProviders: ManagedProvider[] = [];
  // TODO @chad private titleBarIconClickedListener: (icon: TitleBarPlugin.TitleBarIcon | TitleBarPlugin.TitleBarMenuItem)=>void;

  constructor(
    public navCtrl: NavController,
    public zone: NgZone,
    private adminService: AdminService,
    private translate: TranslateService,
  ) {}

  async ngOnInit() {
  }

  async ionViewWillEnter() {
    // Update system status bar every time we re-enter this screen.
    /* TODO @chad
    titleBarManager.setTitle(this.translate.instant('adminproviderlist.title'));

    titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, {
      key: "adminproviderslist-back",
      iconPath: TitleBarPlugin.BuiltInIcon.BACK
    });
    titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_RIGHT, {
      key: "adminproviderslist-addprovider",
      iconPath: TitleBarPlugin.BuiltInIcon.ADD
    });

    this.titleBarIconClickedListener = (clickedIcon) => {
      switch (clickedIcon.key) {
        case "adminproviderslist-back":
          this.navCtrl.back();
          break;
        case "adminproviderslist-addprovider":
          this.navCtrl.navigateForward("adminprovideredit");
          break;
      }
    }
    titleBarManager.addOnItemClickedListener(this.titleBarIconClickedListener);
*/
    this.managedProviders = await this.adminService.getManagedProviders();
  }

  /* TODO @chad ionViewWillLeave() {
    titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, null);
    titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_RIGHT, null);

    titleBarManager.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }*/

  async editProvider(provider: ManagedProvider) {
    this.navCtrl.navigateForward("adminprovideredit", {
      queryParams: {
        providerId: provider.id
      }
    });
  }
}
