import { Injectable, NgZone } from '@angular/core';
import { ToastController, LoadingController, PopoverController } from '@ionic/angular';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { GlobalDIDSessionsService, IdentityEntry } from 'src/app/services/global.didsessions.service';
import { Logger } from 'src/app/logger';
import { SettingsWarningComponent } from '../components/warning/warning.component';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { GlobalNetworksService, MAINNET_TEMPLATE } from 'src/app/services/global.networks.service';

// TODO: config rpc for private net?
type privateConfig = {
  configUrl: string;
  resolveUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeveloperService extends GlobalService  {
  constructor(
    private toastController: ToastController,
    private loadingCtrl: LoadingController,
    private popoverCtrl: PopoverController,
    private zone: NgZone,
    private prefs: GlobalPreferencesService,
    private globalNetworksService: GlobalNetworksService,
    private splashScreen: SplashScreen,
  ) {
    super();
  }

  public popover: any = null;

  public backgroundServicesEnabled = false;
  public selectedNetworkTemplate: string = null;
  public privateNet: privateConfig = {
    configUrl: '',
    resolveUrl: ''
  }

  public init() {
    GlobalServiceManager.getInstance().registerService(this);
  }

  async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    Logger.log("settings", "User signing in, reloading configuration for developer networks");
    await this.getCurrentConfigurations();
  }

  onUserSignOut(): Promise<void> {
    return;
  }

  async getCurrentConfigurations() {
    let networkTemplate = await this.globalNetworksService.getActiveNetworkTemplate();
    let mode = await this.prefs.getPreference<boolean>(GlobalDIDSessionsService.signedInDIDString, "developer.backgroundservices.startonboot");

    this.zone.run(() => {
      this.selectedNetworkTemplate = networkTemplate;
      this.backgroundServicesEnabled = mode;
    });
  }

  async selectNetworkTemplate(
    networkTemplate: string
  ) {
    Logger.log('settings', 'Dev preference set to ' + networkTemplate);
    if (this.selectedNetworkTemplate !== networkTemplate) {
      this.selectedNetworkTemplate = networkTemplate;
      await this.globalNetworksService.setActiveNetworkTemplate(networkTemplate);

      void this.showRestartPrompt();
    }
  }

  // Reset to MainNet
  async resetNet() {
    if (this.selectedNetworkTemplate !== MAINNET_TEMPLATE) {
      await this.globalNetworksService.setActiveNetworkTemplate(MAINNET_TEMPLATE);
      void this.showToast('Network template has been reset to main net');
    }
  }

  /* async configNetwork() {
    if(!this.privateNet.configUrl.length || !this.privateNet.resolveUrl.length) {
      Logger.log('settings', 'Not private net urls filled');
      return;
    } else {
      Logger.log('settings', 'Config private net url..', this.privateNet);
      this.loading();

      this.networks.map((network) => {
        if(network.type === 'priv-net') {
          network.idChainRPCApi = this.privateNet.resolveUrl;
          Logger.log('settings', 'Resolve URL added', network.idChainRPCApi);
          // TODO: for mainchain and ethsc rpc?
        }
      });

      await this.setPreference("chain.network.type", "PrvNet");

      try {
        let config = await this.http.get<any>(this.privateNet.configUrl).toPromise();
        await this.setPreference("chain.network.config", config);
        await this.setPreference("chain.network.configurl", this.privateNet.configUrl);
        await this.setPreference("sidechain.id.rpcapi", this.privateNet.resolveUrl);

        // TODO: for mainchain and ethsc rpc?
        // await this.setPreference("mainchain.rpcapi", this.privateNet.resolveUrl);
        // await this.setPreference("sidechain.eth.rpcapi", this.privateNet.resolveUrl);
        // await this.setPreference("sidechain.eth.apimisc", this.privateNet.resolveUrl);

        Logger.log('settings', config);
        this.loadingCtrl.dismiss();
        this.showToast('Private net sucessfuly configured', this.privateNet.configUrl);
      }
      catch (err) {
        Logger.error('settings', err);
        this.loadingCtrl.dismiss();
        this.privConfigToastErr(err);
      }
    }
  } */

  private async setPreference(key: string, value: any): Promise<void> {
    await this.prefs.setPreference(GlobalDIDSessionsService.signedInDIDString, key, value);
  }

  async showToast(header: string, msg?: string, duration = 4000) {
    const toast = await this.toastController.create({
      color: 'primary',
      mode: 'ios',
      header: header,
      message: msg ? msg : null,
      duration: duration
    });
    await toast.present();
  }

  async privConfigToastErr(err) {
    const toast = await this.toastController.create({
      color: 'primary',
      mode: 'ios',
      header: 'There\'s a problem retrieving your remote file',
      message: err,
      buttons: [
        {
          text: 'Okay',
          handler: () => {
            void toast.dismiss();
            if(this.loadingCtrl) {
              void this.loadingCtrl.dismiss();
            }
          }
        }
      ]
    });
    await toast.present();
  }

  async loading() {
    const loader = await this.loadingCtrl.create({
      mode: "ios",
      spinner: 'bubbles',
      message: 'Please wait...',
      translucent: true,
      backdropDismiss: true
    });

    return await loader.present();
  }

  async restartApp() {
      // navigator["app"].exitApp();
      this.splashScreen.show();
      await GlobalServiceManager.getInstance().emitUserSignOut();
      window.location.href = "/";
  }

  async showRestartPrompt() {
    this.popover = await this.popoverCtrl.create({
        mode: 'ios',
        cssClass: 'wallet-warning-component',
        component: SettingsWarningComponent,
        translucent: false,
        backdropDismiss: false,
    });

    this.popover.onWillDismiss().then(async (params) => {
        this.popover = null;

        if (params && params.data && params.data.confirm) {
            await this.restartApp();
        }
    });

    return await this.popover.present();
  }
}
