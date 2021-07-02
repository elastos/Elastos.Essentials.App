import { Component, ViewChild, ElementRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import QRCode from 'easyqrcodejs';

import { TranslateService } from '@ngx-translate/core';
import { UXService } from '../../services/ux.service';
import { ModalController, IonSlides } from '@ionic/angular';
import { PrintoptionsComponent } from '../../components/printoptions/printoptions.component';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, BuiltInIcon, TitleBarForegroundMode, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { DIDService } from '../../services/did.service';
import { AuthService } from '../../services/auth.service';
import { PopupProvider } from '../../services/popup';
import { DIDURL } from '../../model/didurl.model';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'page-backupdid',
  templateUrl: 'backupdid.html',
  styleUrls: ['backupdid.scss']
})
export class BackupDIDPage {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
  @ViewChild(IonSlides, { static: false }) slide: IonSlides;
  @ViewChild('qrcode', { static: false }) qrcode: ElementRef;

  public qrcodeImg: string;
  public name: string;
  public mnemonic: string;
  public mnemonicList: string[] = [];
  public dataIsReady = false;

  public slideIndex = 0;
  public slideOpts = {
    initialSlide: 0,
    speed: 400,
    init: false
  };

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public router: Router,
    private translate: TranslateService,
    private didService: DIDService,
    private uxService: UXService,
    private modalCtrl: ModalController,
    private nav: GlobalNavService,
    private authService: AuthService,
    private popup: PopupProvider,
    private zone: NgZone,
    private didSessions: GlobalDIDSessionsService,
    public theme: GlobalThemeService
  ) {
    Logger.log('identity', "Entering BackupDID page");
  }

  ionViewWillEnter() {
    this.dataIsReady = false;

    void this.getActiveSlide();
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key: 'back', iconPath: BuiltInIcon.BACK });
    this.titleBar.setNavigationMode(null);
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      void this.nav.exitCurrentContext();
    });
  }

  ionViewDidEnter() {
    void this.authService.checkPasswordThenExecute(
      async () => {
        Logger.log("identity", "Got password, now exporting mnemonic");
        this.name = this.extractName() || "";
        this.mnemonic = await this.didService.activeDidStore.exportMnemonic(
          AuthService.instance.getCurrentUserPassword()
        );
        await this.prepareMnemonic();
        this.dataIsReady = true;
      }, () => {
        void this.nav.navigateBack();
      },
      true,
      true
    );
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  /**
   * Extracts the #name credential value from active DID's credentials
   */
  private extractName(): string | null {
    let credential = this.didService.getActiveDid().getCredentialById(new DIDURL("#name"));
    if (!credential)
      return null;

    return credential.pluginVerifiableCredential.getSubject()["name"];
  }

  private async prepareMnemonic() {
    Logger.log("identity", "Preparing mnemonic");
    this.mnemonicList = this.mnemonic.split(/[\u3000\s]+/).map((word) => {
      return word;
    });

    await this.createQrCode();
  }

  async getActiveSlide() {
    this.slideIndex = await this.slide.getActiveIndex();
    this.slideIndex === 0 ?
      this.titleBar.setTitle(this.translate.instant('didsessions.your-private-qr-code')) :
      this.titleBar.setTitle(this.translate.instant('didsessions.your-private-key'));
  }

  nextSlide() {
    return this.slide.slideNext();
  }

  prevSlide() {
    return this.slide.slidePrev();
  }

  nextClicked() {
    // Next button pressed: go to mnemonic verification screen.
    void this.nav.navigateTo("identity", "/identity/verifymnemonics", {
      state: {
        mnemonicStr: this.mnemonic
      }
    });
  }

  private createQrCode(): Promise<void> {
    Logger.log("identity", "Creating QR code");

    const options = {
      // Basic
      text: this.mnemonic,
      width: 220,
      height: 220,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.L,
      // QR Styling
      dotScale: 1.0,
      PO: 'rgb(25, 26, 47)',
      // Background Img
      // logo: '/assets/icon/elastos.svg',
      // backgroundImage: '/assets/icon/elastos.svg',
      backgroundImageAlpha: 1,
      // Outer Zone
      quietZone: 0,
      quietZoneColor: 'transparent',
    };

    try {
      setTimeout(() => {
        new QRCode(this.qrcode.nativeElement, options);
      }, 0);
      return;
    } catch (e) {
      Logger.warn('identity', "Exception in setTimeout", e);
    }
  }

  async showPrintOptions() {
    Logger.log("identity", "Showing print options to backup the DID");

    this.uxService.modal = await this.modalCtrl.create({
      component: PrintoptionsComponent,
      componentProps: {},
      cssClass: "didsessions-printoptions-component"
    });
    this.uxService.modal.onDidDismiss().then((params) => {
      this.uxService.modal = null;
      if (params && params.data) {
        Logger.log('identity', 'Print options params', params);
        this.print(params.data.printQRCode, params.data.printMnemonicWords)
      }
    });
    this.uxService.modal.present();
  }

  print(qrCode: boolean, mnemonicWords: boolean) {
    let convertedEl = this.qrcode.nativeElement as HTMLElement;
    let canvas = this.qrcode.nativeElement.children[0] as HTMLCanvasElement;
    Logger.log('identity', "Converted element", convertedEl);
    Logger.log('identity', "children", convertedEl.children)

    let options: PrinterPlugin.PrintOptions = {
      name: 'MyDocument',
      orientation: "portrait",
      monochrome: true
    }

    if (qrCode) {
      let title = this.translate.instant('didsessions.print-title');
      let subtitle = this.translate.instant('didsessions.decentralized-id')
      if (mnemonicWords) {
        try {
          (window.cordova.plugins as CordovaPlugins).printer.print(
            "<div style='height: 100%; padding: 0 20px; display: flex; flex-direction: column; justify-content: center; align-items: center;'><ion-label style='margin-bottom: 25px; font-size: 32px; font-weight: 700;'>" + title + "</ion-label><div style='width: 100%; border: 3px solid #000000; border-radius: 17px; padding: 40px 20px; display: flex; flex-direction: column; justify-content: center; align-items: center;'><img src='data:image/png;base64,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'><h1 style='margin: 40px 0 12.5px; text-align: center; font-family: 'Montserrat'; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;'>" + this.name + this.translate.instant('didsessions.name-s') + " <br> " + subtitle + "</h1><img src = '" + canvas.toDataURL() + "'/><p style='margin-top: 25px; padding: 0 120px; text-align: center; font-family: 'Montserrat'; font-size: 13px; font-weight: 500; letter-spacing: -0.5px;'>" + this.mnemonic + "</p></div></div>",
            options,
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            (wasPrinted) => {
              Logger.log('identity', "Document printed successfully?", wasPrinted);
              // TODO: print bug? wasPrinted is wrong.
              // if (wasPrinted) {
                this.zone.run(()=>{
                  void this.checkPrintCompleted();
                });
              // }
            }
          );
        } catch (e) {
          Logger.warn('identity', "Exception in html2canvas", e);
        }
      } else {
        try {
          (window.cordova.plugins as CordovaPlugins).printer.print(
            "<div style='height: 100%; padding: 0 20px; display: flex; flex-direction: column; justify-content: center; align-items: center;'><ion-label style='margin-bottom: 25px; font-size: 32px; font-weight: 700;'>" + title + "</ion-label><div style='width: 100%; border: 3px solid #000000; border-radius: 17px; padding: 40px 20px 80px; display: flex; flex-direction: column; justify-content: center; align-items: center;'><img src='data:image/png;base64,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'><h1 style='margin: 40px 0 12.5px; text-align: center; font-family: 'Montserrat'; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;'>" + this.name + "'s <br> " + subtitle + "</h1><img src = '" + canvas.toDataURL() + "'/></div></div>",
            options,
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            (wasPrinted) => {
              Logger.log('identity', "Document printed successfully?", wasPrinted);
              // TODO: print bug? wasPrinted is wrong.
              // if (wasPrinted) {
                this.zone.run(()=>{
                  void this.checkPrintCompleted();
                });
              // }
            });
        } catch (e) {
          Logger.warn('identity', "Exception in html2canvas", e);
        }
      }
    }
  }

  /**
   * Asks user to confirm that the qr code was really printed.
   */
  private async checkPrintCompleted(): Promise<void> {
    let confirmed: boolean = await this.popup.ionicConfirm(this.translate.instant('didsessions.print-confirmation-title'), this.translate.instant('didsessions.print-confirmation-des'), this.translate.instant('didsessions.print-yes'), this.translate.instant('didsessions.print-try-again'));
    if (confirmed) {
      // Backup is considered as completed, we can go back to the home screen.
      await this.didSessions.markActiveIdentityBackedUp();
      await this.nav.exitCurrentContext();
    }
  }
}
