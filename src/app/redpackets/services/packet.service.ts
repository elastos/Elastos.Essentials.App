import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { Platform, ToastController } from '@ionic/angular';
import { GlobalConfig } from 'src/app/config/globalconfig';
import { Logger } from 'src/app/logger';
import { AnySubWallet } from 'src/app/wallet/model/wallets/subwallet';
import { deserializeCosts, PacketCosts, SerializablePacketCosts } from '../model/packetcosts.model';
import { Packet, PacketInCreation } from '../model/packets.model';

@Injectable({
  providedIn: 'root'
})
export class PacketService {
  //private preparedPacket: Packet = null;
  private preparedPacketSubWallet: AnySubWallet = null;

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

  createPacket(packet: PacketInCreation): Promise<Packet<PacketCosts>> {
    Logger.log('redpackets', 'Creating packet on backend', packet);

    return new Promise((resolve, reject) => {
      // Create a new packet
      this.http.post<Packet<SerializablePacketCosts>>(`${GlobalConfig.RedPackets.serviceUrl}/packets`, packet).subscribe(createdPacket => {
        console.log("createdPacket", createdPacket);
        if (createdPacket) {
          let createdPacketDeserialized: Packet<PacketCosts> = Object.assign({
            costs: null
          }, createdPacket);

          createdPacketDeserialized.costs = deserializeCosts(createdPacket.costs);

          resolve(createdPacketDeserialized);
        }
        else {
          resolve(null);
        }
      }, (err) => {
        Logger.error("redpackets", "Failed to create packet with the backend:", err);
        resolve(null);
      });
    });
  }

  public async requestToCheckPayment(packetHash: string): Promise<void> {
    try {
      let response = await this.http.post(`${GlobalConfig.RedPackets.serviceUrl}/packets/${packetHash}/checkpayments`, {}).toPromise();
      console.log("check payment response", response);
    }
    catch (err) {
      Logger.error("redpackets", "Check payment request failure", err);
    }
  }

  public async getPacketInfo(packetHash: string): Promise<Packet<PacketCosts>> {
    try {
      let packetInfo = await this.http.get<Packet<SerializablePacketCosts>>(`${GlobalConfig.RedPackets.serviceUrl}/packets/${packetHash}`, {}).toPromise();
      if (packetInfo) {
        let deserializedPacket: Packet<PacketCosts> = Object.assign({
          costs: null
        }, packetInfo);

        deserializedPacket.costs = deserializeCosts(packetInfo.costs);

        return deserializedPacket;
      }
    }
    catch (err) {
      Logger.error("redpackets", "Get packet info request failure", err);
    }
  }

  peakPacket(hash: string): Promise<any> {
    console.log('Checking packet', hash);
    return new Promise((resolve, reject) => {
      this.http.get<any>(
        GlobalConfig.RedPackets.serviceUrl + 'peek/' +
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
        GlobalConfig.RedPackets.serviceUrl + 'grab/' +
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
