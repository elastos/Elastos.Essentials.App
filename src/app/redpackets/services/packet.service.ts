import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { GlobalConfig } from 'src/app/config/globalconfig';
import { Logger } from 'src/app/logger';
import { GlobalDIDSessionsService } from 'src/app/services/global.didsessions.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { GrabResponse } from '../model/grab.model';
import { Packet, PacketToCreate, SerializedPacket } from '../model/packets.model';

@Injectable({
  providedIn: 'root'
})
export class PacketService {
  private myPackets: Packet[]; // List of packets created by this user.
  private grabbedPackets: Packet[]; // List of packets already grabbed before (so we don't retry).

  constructor(
    private http: HttpClient,
    private toastController: ToastController,
    private storage: GlobalStorageService
  ) { }

  public async onUserSignIn(): Promise<void> {
    /* if (this.platform.platforms().indexOf("cordova") >= 0) {
      console.log("Listening to intent events")
      appManager.setIntentListener(
        this.onReceiveIntent
      );
    } */

    await this.loadMyPackets();
    await this.loadGrabbedPackets();
  }

  public onUserSignOut() {
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

  createPacket(packet: PacketToCreate): Promise<Packet> {
    Logger.log('redpackets', 'Creating packet on backend', packet);

    return new Promise((resolve, reject) => {
      // Create a new packet
      this.http.post<SerializedPacket>(`${GlobalConfig.RedPackets.serviceUrl}/packets`, packet).subscribe(createdPacket => {
        console.log("createdPacket", createdPacket);
        if (createdPacket) {
          resolve(Packet.fromSerializedPacket(createdPacket));
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

  public async getPacketInfo(packetHash: string): Promise<Packet> {
    try {
      let packetInfo = await this.http.get<SerializedPacket>(`${GlobalConfig.RedPackets.serviceUrl}/packets/${packetHash}`, {}).toPromise();
      if (packetInfo) {
        return Packet.fromSerializedPacket(packetInfo);
      }
    }
    catch (err) {
      Logger.error("redpackets", "Get packet info request failure", err);
      return null;
    }
  }

  public async getPublicPackets(): Promise<Packet[]> {
    try {
      let packets = await this.http.get<SerializedPacket[]>(`${GlobalConfig.RedPackets.serviceUrl}/publicpackets`, {}).toPromise();
      if (packets) {
        let deserializedPackets: Packet[] = [];
        packets.forEach(p => {
          deserializedPackets.push(Packet.fromSerializedPacket(p))
        });

        return deserializedPackets;
      }
    }
    catch (err) {
      Logger.error("redpackets", "Get public packets request failure", err);
      return [];
    }
  }

  /* peakPacket(hash: string): Promise<any> {
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
  } */

  public async createGrabPacketRequest(packetHash: string, userDID: string): Promise<GrabResponse> {
    Logger.log('redpackets', 'Grabbing packet', packetHash, userDID);
    try {
      let grabResponse = await this.http.post<GrabResponse>(`${GlobalConfig.RedPackets.serviceUrl}/packets/${packetHash}/grab`, {
        userDID
      }).toPromise();
      Logger.log('redpackets', 'Grab packet response', grabResponse);
      return grabResponse;
    }
    catch (err) {
      Logger.error("redpackets", "Grab packet request failure", err);
      return null;
    }
  }

  public async createGrabCaptchaVerification(packetHash: string, previousGrabResponse: GrabResponse, captchaString: string): Promise<GrabResponse> {
    Logger.log('redpackets', 'Sending captcha verification');
    try {
      let grabResponse = await this.http.post<GrabResponse>(`${GlobalConfig.RedPackets.serviceUrl}/packets/${packetHash}/grab`, {
        token: previousGrabResponse.token,
        captchaResponse: captchaString
      }).toPromise();
      Logger.log('redpackets', 'Grab packet with captcha response', grabResponse);
      return grabResponse;
    }
    catch (err) {
      Logger.error("redpackets", "Grab packet with captch request failure", err);
      return null;
    }
  }

  private async loadGrabbedPackets(): Promise<void> {
    this.grabbedPackets = await this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, "redpackets", "grabbedpackets", []);
  }

  public packetAlreadyGrabbed(hash: string): boolean {
    return !!this.grabbedPackets.find(p => p.hash === hash);
  }

  private async loadMyPackets(): Promise<void> {
    let serializedPackets = await this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, "redpackets", "mypackets", []);
    this.myPackets = serializedPackets.map(p => Packet.fromSerializedPacket(p));
  }

  private async saveMyPackets(): Promise<void> {
    let serializedPackets = this.myPackets.map(p => p.serialize());
    await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "redpackets", "mypackets", serializedPackets);
  }

  public getMyPackets(): Packet[] {
    return this.myPackets;
  }

  public addToMyPackets(packet: Packet): Promise<void> {
    // Insert at position 0 to keep the most recently created packet first
    this.myPackets.splice(0, 0, packet);
    return this.saveMyPackets();
  }
}
