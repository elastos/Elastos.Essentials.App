import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { Logger } from 'src/app/logger';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { ManagedProvider } from '../../../model/managedprovider';
import { AdminService } from '../../../services/admin.service';
import { PopupService } from '../../../services/popup.service';

type StorageProvider = {
  name: string,
  vaultAddress: string
}

@Component({
  selector: 'app-adminprovideredit',
  templateUrl: './adminprovideredit.page.html',
  styleUrls: ['./adminprovideredit.page.scss'],
})
export class AdminProviderEditPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: false }) titleBar: TitleBarComponent;

  private oldName = '';
  public createName = '';
  public managedProvider: ManagedProvider = null;
  public mnemonicShown = false;
  public adminDIDMnemonic: string = null;
  public adminDIDPublicationStatusFetched = false;
  public adminDIDPublished = false;

  private publishing = false;

  constructor(
    public zone: NgZone,
    public alertController: AlertController,
    private router: Router,
    private adminService: AdminService,
    private popup: PopupService,
    public theme: GlobalThemeService,
    private native: GlobalNativeService,
    private globalNav: GlobalNavService,
    private translate: TranslateService
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation.extras.state) {
      const providerId = navigation.extras.state.providerId;
      Logger.log('HiveManager', 'Provider id', providerId);
      void this.init(providerId);
    }
  }

  async init(id) {
    this.managedProvider = await this.adminService.getManagedProviderById(id);
    this.adminDIDMnemonic = await this.adminService.getAdminDIDMnemonic(this.managedProvider);
    this.oldName = this.managedProvider.name;
    await this.retrieveAdminDIDPublicationStatus();
    Logger.log('HiveManager', "Editing provider:", this.managedProvider);
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('hivemanager.adminprovideredit.title'));
  }

  ionViewWillLeave() {
    if (this.popup.alert) {
      void this.popup.alertCtrl.dismiss();
      this.popup.alert = null;
    }
  }

  private async retrieveAdminDIDPublicationStatus() {
    this.adminDIDPublished = await this.adminService.retrieveAdminDIDPublicationStatus(this.managedProvider);
    this.adminDIDPublicationStatusFetched = true;
  }

  async createAdminDID() {
    if (this.createName) {
      let newProvider: ManagedProvider = await this.adminService.createProvider();
      newProvider.name = this.createName;

      const createdDIDInfo = await this.adminService.createAdminDID(newProvider);
      this.managedProvider = newProvider;
      Logger.log('HiveManager', "createdDIDInfo", createdDIDInfo);
    } else {
      this.popup.toast('hivemanager.toast.provide-name');
    }
  }

  async updateName() {
    if (this.managedProvider.name) {
      await this.adminService.updateAndSaveProvider(this.managedProvider);
      this.native.genericToast('hivemanager.toast.provide-name-update', 2000);
    } else {
      this.native.genericToast('hivemanager.toast.provide-name2', 2000);
      this.managedProvider.name = this.oldName;
    }
  }

  async publishAdminDID() {
    if (this.publishing) return;

    this.publishing = true;
    try {
      await this.adminService.publishAdminDID(this.managedProvider);
    } catch (e) {
      Logger.log('HiveManager', "publishAdminDID exception:", e);
    }
    this.publishing = false;
  }

  async deleteVaultProvider() {
    let confirmed = await this.popup.ionicConfirm("hivemanager.alert.delete-title", "hivemanager.alert.delete-msg", "hivemanager.alert.delete", "hivemanager.alert.cancel");
    if (confirmed) {
      await this.adminService.deleteProvider(this.managedProvider);
      void this.globalNav.navigateBack();
    }
  }

  async toggleMnemonic() {
    this.mnemonicShown = !this.mnemonicShown;
    if (this.mnemonicShown) {
      if (!this.adminDIDMnemonic) {
        this.adminDIDMnemonic = await this.adminService.getAdminDIDMnemonic(this.managedProvider);
      }
    }
  }

  async copy(item: string) {
    await this.native.copyClipboard(item);
    this.native.genericToast("hivemanager.toast.copied");
  }

  getMnemonic(): string {
    if (!this.mnemonicShown) {
      return '****************************************';
    } else {
      return this.adminDIDMnemonic;
    }
  }

  onNameChanged(input) {
    this.managedProvider.name = input;
  }
}
