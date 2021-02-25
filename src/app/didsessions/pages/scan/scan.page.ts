import { Component, OnInit, NgZone } from '@angular/core';
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner/ngx';
import { UXService } from 'src/app/didSessions/services/ux.service';
import { IdentityService } from 'src/app/didSessions/services/identity.service';
import { Events } from 'src/app/didSessions/services/events.service';

@Component({
  selector: 'app-scan',
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
})
export class ScanPage implements OnInit {

  public scanning = false;

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

    console.log('Start scanning');
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
          console.log('Scanned something', text);

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
      console.log('QRScanner error', err);
      await this.identityService.startImportingMnemonic(null);
    });
  }

  ionViewWillLeave(){
    this.zone.run(() => {
      this.scanning = false;
    });
  }

}
