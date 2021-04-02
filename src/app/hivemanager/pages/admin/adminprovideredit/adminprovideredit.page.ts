import { Component, OnInit, ViewChild } from '@angular/core';
import { NavController, AlertController } from '@ionic/angular';
import { NgZone} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { ManagedProvider } from '../../../model/managedprovider';
import { PopupService } from '../../../services/popup.service';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { Logger } from 'src/app/logger';

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
  public mnemonicShown: boolean = false;
  public adminDIDMnemonic: string = null;
  public adminDIDPublicationStatusFetched: boolean = false;
  public adminDIDPublished: boolean = false;

  constructor(
    public navCtrl: NavController,
    public zone: NgZone,
    public alertController:AlertController,
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private popup: PopupService,
    private clipboard: Clipboard,
    public theme: GlobalThemeService,
    private native: GlobalNativeService,
    private translate: TranslateService,
    // public navParams: NavParams // Err - No provider for Navparams
  ) {
    const navigation = this.router.getCurrentNavigation();
    if(navigation.extras.state) {
      const providerId = navigation.extras.state.providerId;
      Logger.log('HiveManager', 'Provider id', providerId);
      this.init(providerId);
    }

/*     this.providerId = navParams.get('providerId');
    Logger.log('HiveManager', 'Provider id', this.providerId);
    this.init();

    this.retrieveAdminDIDPublicationStatus();
    Logger.log('HiveManager', "Editing provider:", this.managedProvider); */
  }

  async init(id) {
    this.managedProvider = await this.adminService.getManagedProviderById(id);
    this.adminDIDMnemonic = await this.adminService.getAdminDIDMnemonic(this.managedProvider);
    this.oldName = this.managedProvider.name;
    this.retrieveAdminDIDPublicationStatus();
    Logger.log('HiveManager', "Editing provider:", this.managedProvider);
  }

  ngOnInit() {
/*     this.route.queryParams.subscribe(async (data: {providerId: string}) => {
      if(data) {
        this.managedProvider = await this.adminService.getManagedProviderById(data.providerId);
        this.adminDIDMnemonic = await this.adminService.getAdminDIDMnemonic(this.managedProvider);

        this.retrieveAdminDIDPublicationStatus();
        Logger.log('HiveManager', "Editing provider:", this.managedProvider);
      }
    }); */
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('adminprovideredit.title'));
  }

  ionViewWillLeave() {
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
      Logger.log('HiveManager', "createdDIDInfo", createdDIDInfo);
    } else {
      this.popup.toast('toast.provide-name');
    }
  }

  async updateName() {
    if(this.managedProvider.name) {
      await this.adminService.updateAndSaveProvider(this.managedProvider);
      this.native.genericToast('toast.provide-name-update', 2000);
    } else {
      this.native.genericToast('toast.provide-name2', 2000);
      this.managedProvider.name = this.oldName;
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
    await this.native.copyClipboard(item);
    this.native.genericToast("toast.copied");
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
