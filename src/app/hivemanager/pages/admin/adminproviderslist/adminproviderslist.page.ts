import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { App } from "src/app/model/app.enum";
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { ManagedProvider } from '../../../model/managedprovider';
import { AdminService } from '../../../services/admin.service';


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
          void this.nav.navigateTo(App.HIVE_MANAGER, "hivemanager/adminprovideredit");
          break;
      }
    });

    this.managedProviders = await this.adminService.getManagedProviders();
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  editProvider(provider: ManagedProvider) {
    void this.nav.navigateTo(App.HIVE_MANAGER, "hivemanager/adminprovideredit", { state: { providerId: provider.id } });
  }
}
