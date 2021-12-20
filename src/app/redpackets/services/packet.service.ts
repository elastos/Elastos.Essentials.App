import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { Platform, ToastController } from '@ionic/angular';
import { Logger } from 'src/app/logger';
import { PacketCosts } from '../model/packetcosts.model';
import { Packet } from '../model/packets.model';

const packetApi = 'https://redpacket.elastos.org/api/v1/packet/';

@Injectable({
  providedIn: 'root'
})
export class PacketService {
  private preparedPacket: Packet = null;

  constructor(
    private platform: Platform,
    private http: HttpClient,
    private router: Router,
    private toastController: ToastController
  ) { }

  init() {
    if (this.platform.platforms().indexOf("cordova") >= 0) {
      console.log("Listening to intent events")
      /* appManager.setIntentListener(
        this.onReceiveIntent
      ); */
    }
  }

  onReceiveIntent = (ret) => {
    console.log("Intent received", ret);

    switch (ret.action) {
      case "grabredpacket":
      /* appManager.hasPendingIntent(() => {
        console.log('Intent recieved', ret);
        this.handledIntentId = ret.intentId;
        this.directToGrab(ret.params);
      }); */
    }
  }

  directToGrab(params) {
    let props: NavigationExtras = {
      queryParams: {
        hash: params.packet,
        // name: params.name,
      }
    }
    void this.router.navigate(['/search'], props);
  }

  /**
   * Saves the given packet as being prepare. The received packet already contains all the needed
   * info. This info is saved and used for the payment step.
   */
  public preparePacket(packet: Packet) {
    this.preparedPacket = packet;

    Logger.log("redpackets", "Preparing packet:", packet);
  }

  public getPrepapredPacket(): Packet {
    return this.preparedPacket;
  }

  /**
   * Compute detailed costs in TOKEN and in NATIVE COIN for the prepared packet.
   */
  public computeCosts(): PacketCosts {
    let costs: PacketCosts = {
      erc202Token: {
        redPacket: '',
        options: {
          publicPacketFees: ''
        }
      },
      nativeToken: {
        redPacket: '',
        transactionFees: '',
        standardServiceFees: '',
        options: {
          publicPacketFees: ''
        }
      }
    };
    return costs;
  }

  /* createPacket(packet: Packet): Promise<boolean> {
    console.log('Creating packet', packet);

    return new Promise((resolve, reject) => {
      this.http.post<any>(packetApi + 'create', packet).subscribe((res) => {
        console.log(res);
        resolve(false);

        let packetType = "";
        if (packet.distributionType === "random") {
          packetType = "Random"
        } else if (packet.distributionType === "fixed") {
          packetType = "Fixed"
        } else {
          packetType === "Supernode"
        }

        let props: NavigationExtras = {
          queryParams: {
            hash: res.result.packet_hash,
            payAddress: res.result.pay_address,
            packetType: packetType,
            ela: packet.value,
            packets: packet.quantity
          }
        }
        void this.router.navigate(['/packet-created'], props)
      }, (err) => {
        console.log(err);
        void this.formErr();
        resolve(false);
      });
    });
  } */

  peakPacket(hash: string): Promise<any> {
    console.log('Checking packet', hash);
    return new Promise((resolve, reject) => {
      this.http.get<any>(
        packetApi + 'peek/' +
        `${'?packet_hash=' + hash + '&show_receivers=true'}`
      ).subscribe((res) => {
        console.log(res);
        resolve(res.result.packet_detail);
      }, (err) => {
        console.log(err);
        resolve(null);
      });
    });
  }

  grabPacket(hash: string, address: string, name: string): Promise<any> {
    console.log('Grabbing packet', hash, address, name);
    return new Promise((resolve, reject) => {
      this.http.get<any>(
        packetApi + 'grab/' +
        `${'?packet_hash=' + hash + '&address=' + address + '&name=' + name}`
      ).subscribe((res) => {
        console.log(res);
        if (res.status === 200) {
          resolve(res);
        } else {
          resolve(null);
        }
      }, (err) => {
        resolve(null);
      });
    });
  }
}
