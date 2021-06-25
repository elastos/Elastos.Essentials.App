import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner/ngx';
import { UXService } from 'src/app/didsessions/services/ux.service';
import { IdentityService } from 'src/app/didsessions/services/identity.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIconSlot, TitleBarForegroundMode, BuiltInIcon, TitleBarIcon, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { Events } from 'src/app/services/events.service';

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
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, { key:'back', iconPath: BuiltInIcon.BACK });
    this.titleBar.setNavigationMode(null);
    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
        this.uxService.onTitleBarItemClicked(icon);
    });

    /* TODO @chad
    titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.INNER_LEFT, {
      key: "backToImport",
      iconPath: TitleBarPlugin.BuiltInIcon.BACK
    });
    titleBarManager.setIcon(TitleBarPlugin.TitleBarIconSlot.OUTER_RIGHT, null);
    titleBarManager.addOnItemClickedListener(async (menuItem)=>{
      if (menuItem.key === "backToImport") {
        await this.identityService.startImportingMnemonic(null);
      }
    });
    */

    Logger.log('didsessions', 'Start scanning');
    // Optionally request the permission early
    this.qrScanner.prepare().then(async (status: QRScannerStatus) => {
      if (status.authorized) {

        this.zone.run(() => {
          this.scanning = true;
        });

        // Show qr scanner
        this.qrScanner.show();

        // Show camera
        // document.getElementsByTagName('body')[0].style.opacity = "0.5";

        // Start scanning
        const scanSub = this.qrScanner.scan().subscribe(async (text: string) => {
          Logger.log('didsessions', 'Scanned something', text);

          this.zone.run(() => {
            this.scanning = false;
          });

          // Hide camera
          // document.getElementsByTagName('body')[0].style.opacity = "1";

          // Hide qr scanner
          this.qrScanner.hide();

          // Stop scanning
          scanSub.unsubscribe();

          await this.identityService.startImportingMnemonic(null);
          this.events.publish('qrScanner', { mnemonic: text });
        });

      } else if (status.denied) {
        await this.identityService.startImportingMnemonic(null);
      } else {
        await this.identityService.startImportingMnemonic(null);
      }
    })
    .catch(async (err: any) => {
      Logger.log('didsessions', 'QRScanner error', err);
      await this.identityService.startImportingMnemonic(null);
    });
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
    this.zone.run(() => {
      this.scanning = false;
    });
  }

}
