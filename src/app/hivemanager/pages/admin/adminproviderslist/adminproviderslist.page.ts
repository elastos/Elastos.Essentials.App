import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import { NgZone} from '@angular/core';
import * as moment from 'moment';

import { AdminService } from '../../../services/admin.service';
import { ManagedProvider } from '../../../model/managedprovider';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, BuiltInIcon, TitleBarIcon } from 'src/app/components/titlebar/titlebar.types';
import { GlobalNavService, App } from 'src/app/services/global.nav.service';

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

  constructor(
    public navCtrl: NavController,
    public zone: NgZone,
    private adminService: AdminService,
    private translate: TranslateService,
    private nav: GlobalNavService
  ) {}

  async ngOnInit() {
  }

  async ionViewWillEnter() {

    this.titleBar.setTitle(this.translate.instant('adminproviderlist.title'));
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
      key: "adminproviderslist-addprovider",
      iconPath: BuiltInIcon.ADD
    });

    this.titleBar.addOnItemClickedListener((icon: TitleBarIcon) => {
      switch (icon.key) {
        case "adminproviderslist-addprovider":
          this.nav.navigateTo(App.HIVE_MANAGER, "adminprovideredit");
          break;
      }
    });

    this.managedProviders = await this.adminService.getManagedProviders();
  }

  async editProvider(provider: ManagedProvider) {
    this.nav.navigateTo(App.HIVE_MANAGER, "adminprovideredit", { providerId: provider.id })
  }
}
