import { Component, OnInit, ViewChild } from '@angular/core';
import { NgZone} from '@angular/core';

import { AdminService } from '../../../services/admin.service';
import { ManagedProvider } from '../../../model/managedprovider';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { App } from "src/app/model/app.enum"

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
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  public managedProviders: ManagedProvider[] = [];

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public zone: NgZone,
    private adminService: AdminService,
    private translate: TranslateService,
    private nav: GlobalNavService
  ) {}

  async ngOnInit() {
  }

  async ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('hivemanager.adminproviderlist.title'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
      key: "adminproviderslist-addprovider",
      iconPath: BuiltInIcon.ADD
    });

    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon: TitleBarIcon) => {
      switch (icon.key) {
        case "adminproviderslist-addprovider":
          this.nav.navigateTo(App.HIVE_MANAGER, "hivemanager/adminprovideredit");
          break;
      }
    });

    this.managedProviders = await this.adminService.getManagedProviders();
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  async editProvider(provider: ManagedProvider) {
    this.nav.navigateTo(App.HIVE_MANAGER, "hivemanager/adminprovideredit", { state: { providerId: provider.id } });
  }
}
