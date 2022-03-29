import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner/ngx';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { IdentityService } from 'src/app/didsessions/services/identity.service';
import { UXService } from 'src/app/didsessions/services/ux.service';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';
import { GlobalNavService } from 'src/app/services/global.nav.service';

@Component({
  selector: 'app-scan',
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
})
export class ScanPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
  public scanning = false;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    private qrScanner: QRScanner,
    private uxService: UXService,
    private events: Events,
    private identityService: IdentityService,
    private zone: NgZone,
    private globalNav: GlobalNavService,
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key:'back', iconPath: BuiltInIcon.BACK });
    this.titleBar.setNavigationMode(null);
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
        this.uxService.onTitleBarItemClicked(icon);
    });

    Logger.log('didsessions', 'Start scanning');
    // Optionally request the permission early
    this.qrScanner.prepare().then(async (status: QRScannerStatus) => {
      if (status.authorized) {

        this.zone.run(() => {
          this.scanning = true;
        });

        // Show qr scanner
        await this.qrScanner.show();

        // Show camera
        // document.getElementsByTagName('body')[0].style.opacity = "0.5";

        // Start scanning
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        const scanSub = this.qrScanner.scan().subscribe(async (text: string) => {
            // Can not show the scan data. Private data, confidential. eg. mnemonic.
          Logger.log('didsessions', 'Scanned something length:', text.length);

          this.zone.run(() => {
            this.scanning = false;
          });

          // Hide camera
          // document.getElementsByTagName('body')[0].style.opacity = "1";

          // Hide qr scanner
          await this.qrScanner.hide();

          // Stop scanning
          scanSub.unsubscribe();

          await this.gotoImportingScreen();
          this.events.publish('qrScanner', { mnemonic: text });
        });

      } else if (status.denied) {
        await this.gotoImportingScreen();
      } else {
        await this.gotoImportingScreen();
      }
    })
    .catch(async (err: any) => {
      Logger.warn('didsessions', 'QRScanner error', err);
      await this.gotoImportingScreen();
    });
  }

  async gotoImportingScreen() {
    // pop scanner from navigation history, so the nav will not navigate to scanner.
    await this.globalNav.clearIntermediateRoutes(['/didsessions/scan'])

    await this.identityService.startImportingMnemonic(null);
  }

  async ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    await this.hideCamera();
  }

  async hideCamera() {
    this.zone.run(() => {
      this.scanning = false;
    });
    await this.qrScanner.hide();
    await this.qrScanner.destroy();
  }

}
