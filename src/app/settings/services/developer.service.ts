import { Injectable, NgZone } from '@angular/core';
import { ToastController, LoadingController, Platform } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { TemporaryAppManagerPlugin } from 'src/app/TMP_STUBS';
import { GlobalPreferencesService } from 'src/app/services/global.preferences.service';
import { DIDSessionsService } from 'src/app/services/didsessions.service';

// TODO: config rpc for private net?
type privateConfig = {
  configUrl: string;
  resolveUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeveloperService {

  constructor(
    private http: HttpClient,
    private toastController: ToastController,
    private loadingCtrl: LoadingController,
    private platform: Platform,
    private zone: NgZone,
    private translate: TranslateService,
    private appManager: TemporaryAppManagerPlugin,
    private prefs: GlobalPreferencesService
  ) {
    this.platform.ready().then(() => {
        this.getCurrentConfigurations();
      });
  }

  public backgroundServicesEnabled = false;
  public cliAddress: string = '';
  public selectedNet: string = null;
  public privateNet: privateConfig = {
    configUrl: '',
    resolveUrl: ''
  }
  public networks = [
      // TODO: ethscRPCApi need to update when it is ready.
    {
      type: 'main-net',
      code: 'MainNet',
      mainChainRPCApi: 'http://api.elastos.io:20336',
      idChainRPCApi: 'http://api.elastos.io:20606',
      ethscRPCApi: 'http://api.elastos.io:20636',
      ethscApiMisc: 'http://api.elastos.io:20634',
      ethscOracle: 'http://api.elastos.io:20632',
      icon: '/assets/icon/main.svg'
    },
    {
      type: 'test-net',
      code: 'TestNet',
      mainChainRPCApi: 'http://api.elastos.io:21336',
      idChainRPCApi: 'http://api.elastos.io:21606',
      ethscRPCApi: 'http://api.elastos.io:21636',
      ethscApiMisc: 'http://api.elastos.io:21634',
      ethscOracle: 'http://api.elastos.io:21632',
      icon: '/assets/icon/test.svg'
    },
    {
      type: 'reg-net',
      code: 'RegTest',
      mainChainRPCApi: 'http://api.elastos.io:22336',
      idChainRPCApi: 'http://api.elastos.io:22606',
      ethscRPCApi: 'http://api.elastos.io:22636',
      ethscApiMisc: 'http://api.elastos.io:22634',
      ethscOracle: 'http://api.elastos.io:22632',
      icon: '/assets/icon/reg.svg'
    },
    {
      type: 'priv-net',
      code: 'PrvNet',
      mainChainRPCApi: 'http://api.elastos.io:22336',
      idChainRPCApi: 'http://api.elastos.io:22606',
      ethscRPCApi: 'http://api.elastos.io:22636',
      ethscApiMisc: 'http://api.elastos.io:22634',
      ethscOracle: 'http://api.elastos.io:22632',
      icon: '/assets/icon/priv.svg'
    },
  ];

  async getCurrentConfigurations() {
    let networkCode = await this.prefs.getPreference<string>(DIDSessionsService.signedInDIDString, "chain.network.type");
    let mode = await this.prefs.getPreference<boolean>(DIDSessionsService.signedInDIDString, "developer.backgroundservices.startonboot");
    let address = await this.prefs.getPreference<string>(DIDSessionsService.signedInDIDString, "trinitycli.runaddress");
    this.zone.run(() => {
      this.selectedNet = networkCode;
      this.backgroundServicesEnabled = mode;
      this.cliAddress = address;
    });
  }

  selectNet(
    networkCode: string,
    mainchainRPCApi: string,
    idChainRPCApi: string,
    ethscRPCApi: string,
    ethscApiMisc: string,
    ethscOracle: string
  ) {
    console.log('Dev preference set to ' + networkCode);
    this.selectedNet = networkCode;
    this.prefs.setPreference(DIDSessionsService.signedInDIDString, "chain.network.type", networkCode);
    this.prefs.setPreference(DIDSessionsService.signedInDIDString, "mainchain.rpcapi", mainchainRPCApi);
    this.prefs.setPreference(DIDSessionsService.signedInDIDString, "sidechain.id.rpcapi", idChainRPCApi);
    this.prefs.setPreference(DIDSessionsService.signedInDIDString, "sidechain.eth.rpcapi", ethscRPCApi);
    this.prefs.setPreference(DIDSessionsService.signedInDIDString, "sidechain.eth.apimisc", ethscApiMisc);
    this.prefs.setPreference(DIDSessionsService.signedInDIDString, "sidechain.eth.oracle", ethscOracle);
  }

  getIndexByNetCode(netCode: string) {
    return this.networks.findIndex(e => e.code === netCode)
  }

  // Reset to MainNet
  resetNet() {
      if (this.selectedNet !== 'MainNet') {
          const index = this.getIndexByNetCode('MainNet');
          this.selectNet(
            this.networks[index].code,
            this.networks[index].mainChainRPCApi,
            this.networks[index].idChainRPCApi,
            this.networks[index].ethscRPCApi,
            this.networks[index].ethscApiMisc,
            this.networks[index].ethscOracle
          );
          this.showToast('Network type has been set to main net');
      }
  }

  async toggleBackgroundServices() {
    this.backgroundServicesEnabled = !this.backgroundServicesEnabled;
    await this.setPreference("developer.backgroundservices.startonboot", this.backgroundServicesEnabled);
    this.showToast(this.translate.instant('please-restart'));
  }

  async configCliAddress() {
    if(this.cliAddress.length) {
      console.log('Trinity-CLI run command address filled', this.cliAddress);
      await this.setPreference("trinitycli.runaddress", this.cliAddress);
      this.showToast('Client address set to ' + this.cliAddress, 'Your app will start installing in a few seconds', 6000);
    }
  }

  async configNetwork() {
    if(!this.privateNet.configUrl.length || !this.privateNet.resolveUrl.length) {
      console.log('Not private net urls filled');
      return;
    } else {
      console.log('Config private net url..', this.privateNet);
      this.loading();

      this.networks.map((network) => {
        if(network.type === 'priv-net') {
          network.idChainRPCApi = this.privateNet.resolveUrl;
          console.log('Resolve URL added', network.idChainRPCApi);
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

        console.log(config);
        this.loadingCtrl.dismiss();
        this.showToast('Private net sucessfuly configured', this.privateNet.configUrl);
      }
      catch (err) {
        console.error(err);
        this.loadingCtrl.dismiss();
        this.privConfigToastErr(err);
      }
    }
  }

  private async setPreference(key: string, value: any): Promise<void> {
    await this.prefs.setPreference(DIDSessionsService.signedInDIDString, key, value);
  }

  async showToast(header: string, msg?: string, duration: number = 4000) {
    const toast = await this.toastController.create({
      color: 'primary',
      mode: 'ios',
      header: header,
      message: msg ? msg : null,
      duration: duration
    });
    toast.present();
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
            toast.dismiss();
            if(this.loadingCtrl) {
              this.loadingCtrl.dismiss();
            }
          }
        }
      ]
    });
    toast.present();
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
}
