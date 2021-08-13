import { Component, NgZone, ViewChild } from '@angular/core';
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
import { isObject } from 'lodash-es';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { GlobalWalletConnectService, WalletConnectSessionRequestSource } from 'src/app/services/global.walletconnect.service';
import { App } from 'src/app/model/app.enum';

// The worker JS file from qr-scanner must be copied manually from
// the qr-scanner node_modules sources and copied to our assets/folder
QrScanner.WORKER_PATH = "./assets/scanner/qr-scanner-worker.min.js"

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
    isCameraShown = false;
    contentWasScanned = false;
    scannedText = "";
    scanSub: Subscription = null;
    fromIntentRequest = false;
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
        public theme: GlobalThemeService,
        private globalIntentService: GlobalIntentService,
        private globalWalletConnectService: GlobalWalletConnectService,
        private globalNav: GlobalNavService,
        private translate: TranslateService,
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (isObject(navigation.extras.state)) {
            this.fromIntentRequest = navigation.extras.state.fromIntent;
        }
    }

    ionViewWillEnter() {
        this.titleBar.setTitle(this.translate.instant('launcher.app-scanner'));
        this.showGalleryTitlebarKey(true);
        this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (clickedItem)=>{
            if (clickedItem.key == "gallery") {
                void this.scanFromLibrary();
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
    ionViewWillLeave() {
        this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
        this.zone.run(() => {
            Logger.log("Scanner", "Scan view is leaving")
            this.stopScanning();
            void this.hideCamera().then(() => {
                document.body.classList.remove("transparentBody");
            })
        });
    }

    /**
     * Toggle flash light on or off
     */
    toggleLight() {
        this.torchLightOn = !this.torchLightOn;

        if (!this.torchLightOn)
            return this.qrScanner.disableLight();
        else
            return this.qrScanner.enableLight();
    }

    async showCamera() {
        // Make sure to make ion-app and ion-content transparent to see the camera preview
        document.body.classList.add("transparentBody");
        await this.qrScanner.show();
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
        this.qrScanner.prepare().then(async (status: QRScannerStatus) => {
            Logger.log("Scanner", "Scanner prepared")
            if (status.authorized) {
                // Camera permission was granted. Start scanning
                Logger.log("Scanner", "Scanner authorized")

                // Show camera preview
                Logger.log("Scanner", "Showing camera preview")
                await this.showCamera()

                // Start scanning and listening to scan results
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
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
                        await this.runScannedContent(this.scannedText)
                    else
                        await this.returnScannedContentToIntentRequester(this.scannedText);
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
            iconPath: !this.theme.darkMode ? "assets/scanner/imgs/gallery.svg" : "assets/scanner/imgs/darkmode/gallery.svg"
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
          await this.alertController.dismiss();
          this.alert = null;
        }

        Logger.log("Scanner", "Stopping camera, getting ready to pick a picture from the gallery.");
        await this.hideCamera();
        this.stopScanning();
        this.showGalleryTitlebarKey(false);

        setTimeout(() => {
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
                                    // why?
                                    // We create worker manually.
                                    // if use 'QrScanner.scanImage(image)', it will create BarcodeDetector engine in some devices, and it can't get the qr code.
                                    let worker: Worker = new Worker(QrScanner.WORKER_PATH)
                                    code = await QrScanner.scanImage(image, null, worker);
                                }
                                catch (err) {
                                    //debugger;
                                    Logger.error("Scanner", err);
                                    code = null;
                                }
                                Logger.log("Scanner", "Read qr code:", code);

                                if (code != null) {
                                    this.showGalleryTitlebarKey(true);
                                    // A QR code could be found in the picture
                                    this.scannedText = code as string;
                                    if (!this.fromIntentRequest)
                                        await this.runScannedContent(this.scannedText)
                                    else
                                        await this.returnScannedContentToIntentRequester(this.scannedText);
                                } else {
                                    void this.alertNoScannedContent('common.sorry', 'scanner.no-qr-err');
                                }
                            }

                            image.src = "data:image/png;base64,"+data; // base64 string

                            // Free the memory
                            navigator.camera.cleanup(()=>{}, (err)=>{});
                        }
                        catch (e) {
                            void this.alertNoScannedContent('common.sorry', 'scanner.scan-err');
                            Logger.warn("Scanner", "Error while loading the picture as PNG:", e);
                        }
                    });
                }
            }
            , (err)=>{
                // 'No Image Selected': User canceled.
                if (err === 'No Image Selected') {
                    this.showGalleryTitlebarKey(true);
                    this.zone.run(() => {
                        this.startScanningProcess();
                    });
                } else {
                    Logger.error("Scanner", err);
                    void this.alertNoScannedContent('sorry', 'scanner.gallery-err');
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
    async runScannedContent(scannedContent: string) {
        // pop scanner from navigation history, so the nav will not navigate to scanner.
        await this.globalNav.exitCurrentContext(false);

        // Special case - DID FORMAT CHECK - DIDs are considered as URLs by the URL class
        if (this.contentIsElastosDID(scannedContent)) {
            await this.sendIntentAsRaw(scannedContent)
        }
        else if (this.globalWalletConnectService.canHandleUri(scannedContent)) {
            await this.globalWalletConnectService.handleWCURIRequest(scannedContent, WalletConnectSessionRequestSource.SCANNER);
        }
        else {
            try {
                new URL(scannedContent);
                await this.sendIntentAsUrl(scannedContent);
            } catch (_) {
                // Content can't be parsed as a URL: fallback solution is to use it as raw content
                await this.sendIntentAsRaw(scannedContent);
            }
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
            // We call exitCurrentContext before,
            // so we need add scanner to navigation history again if do not exit scanner.
            void this.globalNav.navigateRoot(App.SCANNER)
            this.ngZone.run(() => {
                void this.showNooneToHandleIntent()
            })
        }
    }

    async sendIntentAsRaw(scannedContent: string) {
        let scanIntentAction = "";

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
            // We call exitCurrentContext before,
            // so we need add scanner to navigation history again if do not exit scanner.
            void this.globalNav.navigateRoot(App.SCANNER)
            this.ngZone.run(() => {
                void this.showNooneToHandleIntent()
            })
        }
    }

    contentIsElastosDID(scannedContent) {
        return (scannedContent.indexOf("did:elastos:") == 0);
    }

    async showNooneToHandleIntent() {
        this.alert = await this.alertController.create({
            mode: 'ios',
            message: this.translate.instant('scanner.no-app-err'),
            backdropDismiss: false,
            buttons: [
            {
                text: this.translate.instant('common.ok'),
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

    async alertNoScannedContent(title: string, msg: string, btnText = 'ok') {
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
    }
}
