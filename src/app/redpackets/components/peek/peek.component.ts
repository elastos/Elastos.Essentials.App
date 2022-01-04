import { Component, OnInit } from '@angular/core';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { ToastController } from '@ionic/angular';
import { PacketDetail } from '../../model/packets.model';
import { PacketService } from '../../services/packet.service';

@Component({
  selector: 'app-peek',
  templateUrl: './peek.component.html',
  styleUrls: ['./peek.component.scss'],
})
export class PeekComponent implements OnInit {

  public hash = '';
  public packet: PacketDetail;
  public seekingPacket = false;

  constructor(
    public packetService: PacketService,
    private toastController: ToastController,
    private clipboard: Clipboard
  ) { }

  ngOnInit() { }

  searchHash() {
    if (this.hash) {
      this.seekingPacket = true;
      /* void this.packetService.peakPacket(this.hash).then((res) => {
        this.seekingPacket = false;
        if (res) {
          this.packet = res;
          console.log('Packet found', this.packet);
        } else {
          void this.toastErr();
        }
      }); */
    }
  };

  getTime(timestamp: number) {
    return new Date(timestamp).toLocaleString();
  }

  getType(type: number) {
    if (type === 0) {
      return 'Random'
    } else if (type === 1) {
      return 'Fixed'
    } else {
      return 'Supernode'
    }
  }

  copy(hash: string) {
    void this.clipboard.copy(hash);
    void this.copyToast(hash);
  }

  async copyToast(hash: string) {
    const toast = await this.toastController.create({
      mode: 'ios',
      color: 'danger',
      header: 'Copied hash',
      message: hash,
      duration: 2000
    });
    void toast.present();
  }

  async toastErr() {
    const toast = await this.toastController.create({
      mode: 'ios',
      color: 'danger',
      header: 'Packet is invalid',
      message: 'Are you sure this is a correct hash?',
      duration: 4000
    });
    void toast.present();
  }
}
