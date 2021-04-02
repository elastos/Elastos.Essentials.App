import { Component, NgZone, ViewChild } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { AlertController } from '@ionic/angular'
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner/ngx';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IntentService } from '../../services/intent.service';
import QrScanner from 'qr-scanner';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from 'src/app/logger';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { ESSENTIALS_CONNECT_URL_PREFIX, GlobalConnectService } from 'src/app/services/global.connect.service';
import { isObject } from 'lodash-es';

// The worker JS file from qr-scanner must be copied manually from the qr-scanner node_modules sources and copied to our assets/ folder
QrScanner.WORKER_PATH = "./assets/qr-scanner-worker.min.js"

export type ScanPageRouteParams = {
    fromIntent: boolean
}

@Component({
    selector: 'app-scan',
    templateUrl: './scan.page.html',
    styleUrls: ['./scan.page.scss'],
})
export class ScanPage {
    @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

    torchLightOn: boolean;
    isCameraShown: boolean = false;
    contentWasScanned: boolean = false;
    scannedText: string = "";
    scanSub: Subscription = null;
    fromIntentRequest: boolean = false;
    loader: any = null;
    alert: any = null;

    private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private qrScanner: QRScanner,
        private ngZone: NgZone,
        private intentService: IntentService,
        private zone: NgZone,
        private alertController: AlertController,
        private loadingController: LoadingController,
        private theme: GlobalThemeService,
        private globalIntentService: GlobalIntentService,
        private globalConnectService: GlobalConnectService,
        private translate: TranslateService,
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (isObject(navigation.extras.state)) {
            this.fromIntentRequest = navigation.extras.state.fromIntent;
        }
    }

    ionViewWillEnter() {
        this.titleBar.setNavigationMode(null);
        this.showGalleryTitlebarKey(true);
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (clickedItem)=>{
            if (clickedItem.key == "gallery") {
                this.scanFromLibrary();
            }
        });
    }

    ionViewDidEnter() {
        Logger.log("Scanner", "Starting scanning process");
        this.startScanningProcess();
    }

    /**
     * Leaving the page, do some cleanup.
     */
    async ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
        this.zone.run(async () => {
            Logger.log("Scanner", "Scan view is leaving")
            this.stopScanning();
            await this.hideCamera();
            document.body.classList.remove("transparentBody");
        });
    }

    /**
     * Toggle flash light on or off
     */
    toggleLight() {
        this.torchLightOn = !this.torchLightOn;

        if (!this.torchLightOn)
            this.qrScanner.disableLight();
        else
            this.qrScanner.enableLight();
    }

    showCamera() {
        // Make sure to make ion-app and ion-content transparent to see the camera preview
        document.body.classList.add("transparentBody");
        this.qrScanner.show();
        this.isCameraShown = true; // Will display controls
    }

    async hideCamera() {
        window.document.querySelector('ion-app').classList.remove('transparentBody')
        await this.qrScanner.hide();
        await this.qrScanner.destroy();

        this.zone.run(() => {
          this.isCameraShown = false;
        });
    }

    startScanningProcess() {
        this.qrScanner.prepare().then((status: QRScannerStatus) => {

            Logger.log("Scanner", "Scanner prepared")
            if (status.authorized) {
                // Camera permission was granted. Start scanning
                Logger.log("Scanner", "Scanner authorized")

                // Show camera preview
                Logger.log("Scanner", "Showing camera preview")
                this.showCamera()

                // Start scanning and listening to scan results
                this.scanSub = this.qrScanner.scan().subscribe(async (text: string) => {
                    Logger.log("Scanner", "Scanned data: ", text)
                    this.scannedText = text;

                    this.ngZone.run(() => {
                        this.contentWasScanned = true
                    });

                    await this.hideCamera()
                    this.stopScanning()

                    // Either emit a new intent if the scanner app was opened manually, or
                    // send a intent resposne if this app was opened by a "scanqrcode" intent request.
                    if (!this.fromIntentRequest)
                        this.runScannedContent(this.scannedText)
                    else
                        this.returnScannedContentToIntentRequester(this.scannedText);
                });
                // Wait for user to scan something, then the observable callback will be called
            } else if (status.denied) {
                // Camera permission was permanently denied
                Logger.log("Scanner", "Access to QRScanner plugin was permanently denied")
            } else {
                // Permission was denied, but not permanently. You can ask for permission again at a later time.
                Logger.log("Scanner", "Access to QRScanner plugin is currently denied")
            }
        }).catch((e: any) => Logger.error("Scanner", 'Unexpected error: ', e, e));
    }

    stopScanning() {
        if (this.scanSub) {
            this.scanSub.unsubscribe();
            this.scanSub = null;
        }
    }

    showGalleryTitlebarKey(show: boolean) {
      if (show) {
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
            key: "gallery",
            iconPath: !this.theme.darkMode ? "assets/scanner/imgs/upload.svg" : "assets/scanner/imgs/darkmode/upload.svg"
        });
      } else {
        this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);
      }
    }

    /**
     * Initiates a QR code scanning from a picture chosen from the library by the user.
     */
    async scanFromLibrary() {
        if (this.alert) {
          this.alertController.dismiss();
          this.alert = null;
        }

        Logger.log("Scanner", "Stopping camera, getting ready to pick a picture from the gallery.");
        this.showLoading();
        await this.hideCamera();
        this.stopScanning();
        this.showGalleryTitlebarKey(false);

        setTimeout(async () => {
            Logger.log("Scanner", "Opening gallery to pick a picture");
            // Ask user to pick a picture from the library
            navigator.camera.getPicture((data)=>{
                Logger.log("Scanner", "Got gallery data");
                if (data) {
                    this.zone.run(() => {
                        try {
                            const image = new Image();
                            image.onload = async() => {
                                Logger.log("Scanner", "Loaded image size:", image.width, image.height);

                                let code: string;
                                try {
                                    code = await QrScanner.scanImage(image);
                                }
                                catch (err) {
                                    //debugger;
                                    Logger.error("Scanner", err);
                                    code = null;
                                }
                                Logger.log("Scanner", "Read qr code:", code);

                                if (code != null) {
                                    this.hideLoading();
                                    this.showGalleryTitlebarKey(true);
                                    // A QR code could be found in the picture
                                    this.scannedText = code as string;
                                    if (!this.fromIntentRequest)
                                        this.runScannedContent(this.scannedText)
                                    else
                                        this.returnScannedContentToIntentRequester(this.scannedText);
                                } else {
                                    this.alertNoScannedContent('sorry', 'no-qr-err');
                                }
                            }

                            image.src = "data:image/png;base64,"+data; // base64 string

                            // Free the memory
                            navigator.camera.cleanup(()=>{}, (err)=>{});
                        }
                        catch (e) {
                            this.alertNoScannedContent('sorry', 'scan-err');
                            Logger.warn("Scanner", "Error while loading the picture as PNG:", e);
                        }
                    });
                }
            }
            , (err)=>{
                Logger.error("Scanner", err);
                // 'No Image Selected': User canceled.
                if (err === 'No Image Selected') {
                    this.hideLoading();
                    this.showGalleryTitlebarKey(true);
                    this.zone.run(() => {
                        this.startScanningProcess();
                    });
                } else {
                    this.alertNoScannedContent('sorry', 'gallery-err');
                }
            }, {
                targetWidth: 1200, // Reduce picture size to avoid memory problems - keep it large enough for QR code readabilitiy
                targetHeight: 1200,
                destinationType: 0, // Return as base64 data string
                sourceType: 0, // Pick from photo library
                encodingType: 1 // Return as PNG base64 data
            });
        }, 100);
    }

    async returnScannedContentToIntentRequester(scannedContent: string) {
        await this.intentService.sendScanQRCodeIntentResponse(scannedContent);
    }

    /**
     * Executes the scanned content. If the content is recognized as a URL, we send a URL intent.
     * Otherwise, we send a "handlescannedcontent" intent so that user can pick an app to use this content
     * (ex: scanned content is a ELA address, so user may choose to open the wallet app to send ELA to this address)
     */
    runScannedContent(scannedContent: string) {
        try {
            new URL(scannedContent);

            // Special case - DID FORMAT CHECK - DIDs are considered as URLs by the URL class
            if (this.contentIsElastosDID(scannedContent)) {
                this.sendIntentAsRaw(scannedContent)
            }
            // Special case: essentials connect qr codes
            else if (scannedContent.startsWith(ESSENTIALS_CONNECT_URL_PREFIX)) {
                this.globalConnectService.processEssentialsConnectUrl(scannedContent);
            }
            else {
                this.sendIntentAsUrl(scannedContent)
            }
        } catch (_) {
            // Content can't be parsed as a URL: fallback solution is to use it as raw content
            this.sendIntentAsRaw(scannedContent)
        }
    }

    async sendIntentAsUrl(scannedContent: string) {
        // Special backward compatibility case: convert elastos:// into https://did.elastos.net/ for CR sign in
        if (scannedContent.indexOf("elastos://") === 0)
            scannedContent = scannedContent.replace("elastos://", "https://did.elastos.net/");

        try {
            Logger.log("Scanner", "Sending scanned content as a URL intent:", scannedContent);
            await this.globalIntentService.sendUrlIntent(scannedContent);
            // URL intent sent
            Logger.log("Scanner", "sendUrlIntent successfully")
            await this.exitApp()
        }
        catch (err) {
            Logger.error("Scanner", "sendUrlIntent failed", err)
            this.ngZone.run(() => {
                this.showNooneToHandleIntent()
            })
        }
    }

    async sendIntentAsRaw(scannedContent: string) {
        let scanIntentAction: string = "";

        // Handle specific content types to redirect to a more appropriate action.
        // DID FORMAT CHECK
        if (this.contentIsElastosDID(scannedContent)) {
            // The scanned content seems to be a Elastos DID -> send this as a scanned "DID".
            scanIntentAction = "handlescannedcontent_did"
        }
        else {
            scanIntentAction = "handlescannedcontent"
        }

        try {
            Logger.log("Scanner", "Sending scanned content as raw content to an "+scanIntentAction+" intent action");
            await this.globalIntentService.sendIntent(scanIntentAction, {data: scannedContent});

            // Raw intent sent
            Logger.log("Scanner", "Intent sent successfully as action '"+scanIntentAction+"'")
            await this.exitApp();
        }
        catch (err) {
            Logger.error("Scanner", "Intent sending failed", err)
            this.ngZone.run(() => {
                this.showNooneToHandleIntent()
            })
        }
    }

    contentIsElastosDID(scannedContent) {
        return (scannedContent.indexOf("did:elastos:") == 0);
    }

    async showNooneToHandleIntent() {
        this.alert = await this.alertController.create({
            mode: 'ios',
            message: this.translate.instant('no-app-err'),
            backdropDismiss: false,
            buttons: [
            {
                text: this.translate.instant('ok'),
                handler: () => {
                  this.startScanningProcess();
                }
              }
            ]
        });
        this.alert.onWillDismiss().then(() => {
          this.alert = null;
        });
        this.alert.present()
    }

    async alertNoScannedContent(title: string, msg: string, btnText: string = 'ok') {
        this.hideLoading();
        this.showGalleryTitlebarKey(true);

        this.alert = await this.alertController.create({
          mode: 'ios',
          header: this.translate.instant(title),
          message: this.translate.instant(msg),
          backdropDismiss: false,
          buttons: [
           {
              text: this.translate.instant(btnText),
              handler: () => {
                this.startScanningProcess();
              }
            }
          ]
        });
        this.alert.onWillDismiss().then(() => {
          this.alert = null;
        });
        this.alert.present()
    }

    async exitApp() {
        Logger.log("Scanner", "Exiting app")

        this.stopScanning();
        await this.hideCamera();

        // TODO @chad, navigate somewhere else instead - essentialsIntentManager.close();
    }

    public async showLoading() {
      this.loader = await this.loadingController.create({
        mode: 'ios',
        cssClass: !this.theme.darkMode ? 'custom-loader-wrapper' : 'dark-custom-loader-wrapper',
        spinner: null,
        message: !this.theme.darkMode ? '<div class="custom-loader"><div class="lds-dual-ring"><div></div><div></div><div></div><div></div><div></div></div><ion-label>' + this.translate.instant('please-wait') +' </ion-label></div>' : '<div class="dark-custom-loader"><div class="dark-lds-dual-ring"><div></div><div></div><div></div><div></div><div></div><div></div></div><ion-label>' + this.translate.instant('please-wait') + '</ion-label></div>',
      });
      this.loader.onWillDismiss().then(() => {
        this.loader = null;
      })
      return await this.loader.present();
    };

    public hideLoading(): void {
      if(this.loader) {
        this.loader.dismiss();
      }
    };
}
