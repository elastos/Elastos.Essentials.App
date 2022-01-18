import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { ToastController } from '@ionic/angular';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarForegroundMode, TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { PacketService } from '../../services/packet.service';

@Component({
  selector: 'app-packet-created',
  templateUrl: './packet-created.page.html',
  styleUrls: ['./packet-created.page.scss'],
})
export class PacketCreatedPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public hash = "";
  public payAddress = "";
  public packetType = "";
  public ela: number = null;
  public packets: number = null;
  public beneficiaries: string[] = [];
  public copied = false;

  constructor(
    public packetService: PacketService,
    private route: ActivatedRoute,
    private clipboard: Clipboard,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params) {
        this.hash = params.hash,
          this.payAddress = params.payAddress,
          this.packetType = params.packetType,
          this.ela = params.ela,
          this.packets = params.packets,
          this.beneficiaries = params.beneficiaries
      }
    });
  }

  ionViewWillEnter() {
    this.titleBar.setTitle("Success!");
    this.titleBar.setNavigationMode(TitleBarNavigationMode.CLOSE);
    this.titleBar.setBackgroundColor("#f04141");
    this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
  }

  ionViewDidEnter() {
  }

  copy(type: string) {
    this.copied = true;
    if (type === 'address') {
      void this.clipboard.copy(this.payAddress);
      void this.copyToast(type, this.payAddress)
    } else if (type === 'hash') {
      void this.clipboard.copy(this.hash);
      void this.copyToast(type, this.hash)
    } else {
      void this.clipboard.copy('https://scheme.elastos.org/grabredpacket?packet=' + this.hash);
      void this.copyToast(type, 'https://scheme.elastos.org/grabredpacket?packet=' + this.hash);
    }
  }

  pay() {
    /* appManager.sendIntent(
      'pay',
      {
        receiver: this.payAddress,
        amount: this.ela,
        memo: null,
      },
      {},
      (res) => {
        console.log(res);
      },
      (err) => {
        console.log(err);
      }
    ); */
  }

  async copyToast(type: string, value: any) {
    console.log(type, value);
    const toast = await this.toastController.create({
      mode: 'ios',
      color: 'danger',
      header: 'Copied ' + type,
      message: value,
      duration: 2000
    });
    void toast.present();
  }

  /* openApp() {
    appManager.start("org.elastos.trinity.dapp.wallet");
  }

  closeApp() {
    appManager.close();
  } */
}
