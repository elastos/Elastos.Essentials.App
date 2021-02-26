import { Component, OnInit } from '@angular/core';
import { NavController, AlertController} from '@ionic/angular';
import { NgZone} from '@angular/core';
import { StorageService } from '../../services/storage.service';
import { AppService } from '../../services/app.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TranslateService } from '@ngx-translate/core';
import { TemporaryAppManagerPlugin } from 'src/app/TMP_STUBS';

declare let didManager: DIDPlugin.DIDManager;

@Component({
  selector: 'app-signin',
  templateUrl: './signin.page.html',
  styleUrls: ['./signin.page.scss'],
})
export class SignInPage implements OnInit {
  public didHasToBePublished = false;

  constructor(
    public navCtrl: NavController,
    public zone: NgZone,
    public alertController:AlertController,
    private storage: StorageService,
    private appService: AppService,
    public theme: GlobalThemeService,
    private translate: TranslateService,
    private appManager: TemporaryAppManagerPlugin
  ) {}

  ngOnInit() {
  }

  /* TODO @chad
  ionViewWillEnter() {
    titleBarManager.setNavigationMode(TitleBarPlugin.TitleBarNavigationMode.CLOSE);
    titleBarManager.setTitle(this.translate.instant('signin.title'));
  }
  */

  ionViewDidEnter(){
  }

  signIn() {
    this.appManager.sendIntent("https://did.elastos.net/credaccess", {
      claims: {}
    }, {
      // TODO - RESTORE AFTER NATIVE CRASH (dongxiao) appId: "org.elastos.trinity.dapp.did" // Force receiving by the DID app
    }, async (response: {result: { did: string, presentation: string }})=>{
      console.log("Got credaccess response:", response);
      if (response && response.result && response.result.did) {
        console.log("Got DID info:", response.result.did);

        // Make sure that the DID is on chain, otherwise we warn user about it and suggest him
        // to publish
        console.log("Making sure that the DID is on chain");
        let publishedDIDDocument = await this.resolveDIDDocument(response.result.did);
        if (publishedDIDDocument) {
          console.log("The DID document was found on ID chain");

          // We are "signed in". Save the DID to local storage.
          await this.storage.setSignedInDID(response.result.did);

          // Now to the next expected screen
          this.zone.run(()=>{
            this.appService.goToPostSignInRoute();
          });
        }
        else {
          console.log("The DID doesn't seem to be published, asking user to do so.");

          this.zone.run(()=>{
            this.didHasToBePublished = true;
          });
        }
      }
      else {
        console.warn("No DID field returned by credaccess, there is something wrong.");
      }
    }, (err)=>{
      console.error(err);
    })
  }

  public publishDID() {
    this.appManager.sendIntent("https://did.elastos.net/promptpublishdid", null, null);
  }

  private resolveDIDDocument(didString: string): Promise<DIDPlugin.DIDDocument> {
    return new Promise((resolve)=>{
      didManager.resolveDidDocument(didString, true, (didDocument)=>{
        resolve(didDocument);
      }, (err)=>{
        resolve(null);
      });
    });
  }
}
