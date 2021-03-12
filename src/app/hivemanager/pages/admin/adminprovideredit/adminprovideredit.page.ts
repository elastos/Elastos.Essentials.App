import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController, AlertController} from '@ionic/angular';
import { NgZone} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { ManagedProvider } from '../../../model/managedprovider';
import { PopupService } from '../../../services/popup.service';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';

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

  public createName = '';

  public managedProvider: ManagedProvider = null;
  public mnemonicShown: boolean = false;
  public adminDIDMnemonic: string = null;
  public adminDIDPublicationStatusFetched: boolean = false;
  public adminDIDPublished: boolean = false;

  constructor(
    public navCtrl: NavController,
    public zone: NgZone,
    public alertController:AlertController,
    private route: ActivatedRoute,
    private adminService: AdminService,
    private popup: PopupService,
    private clipboard: Clipboard,
    public theme: GlobalThemeService,
    private translate: TranslateService,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(async (data: {providerId: string}) => {
      if(data) {
        this.managedProvider = await this.adminService.getManagedProviderById(data.providerId);
        this.adminDIDMnemonic = await this.adminService.getAdminDIDMnemonic(this.managedProvider);

        this.retrieveAdminDIDPublicationStatus();
        console.log("Editing provider:", this.managedProvider);
      }
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('adminprovideredit.title'));
  }

  async ionViewWillLeave() {
    if(this.managedProvider) {
      if(this.managedProvider.name) {
        await this.adminService.updateAndSaveProvider(this.managedProvider);
      } else {
        this.managedProvider.name = 'Anonymous'
        await this.adminService.updateAndSaveProvider(this.managedProvider);
      }
    }

    if (this.popup.alert) {
      this.popup.alertCtrl.dismiss();
      this.popup.alert = null;
    }
  }

  private async retrieveAdminDIDPublicationStatus() {
    this.adminDIDPublished = await this.adminService.retrieveAdminDIDPublicationStatus(this.managedProvider);
    this.adminDIDPublicationStatusFetched = true;
  }

  async createAdminDID() {
    if(this.createName) {
      let newProvider: ManagedProvider = await this.adminService.createProvider();
      newProvider.name = this.createName;

      const createdDIDInfo = await this.adminService.createAdminDID(newProvider);
      this.managedProvider = newProvider;
      console.log("createdDIDInfo", createdDIDInfo);
    } else {
      this.popup.toast('toast.provide-name');
    }
  }

  publishAdminDID() {
    this.adminService.publishAdminDID(this.managedProvider);
  }

  async deleteVaultProvider() {
    let confirmed = await this.popup.ionicConfirm("alert.delete-title", "alert.delete-msg", "alert.delete", "alert.cancel");
    if (confirmed) {
      await this.adminService.deleteProvider(this.managedProvider);
      this.navCtrl.back();
    }
  }

  async toggleMnemonic() {
    this.mnemonicShown = !this.mnemonicShown;
    if(this.mnemonicShown) {
      if(!this.adminDIDMnemonic) {
        this.adminDIDMnemonic = await this.adminService.getAdminDIDMnemonic(this.managedProvider);
      }
    }
  }

  async copy(item: string) {
    await this.clipboard.copy(item);
    this.popup.toast("toast.copied");
  }

  getMnemonic(): string {
    if(!this.mnemonicShown) {
      return '****************************************';
    } else {
      return this.adminDIDMnemonic;
    }
  }

  onNameChanged(input) {
    this.managedProvider.name = input;
  }
}
