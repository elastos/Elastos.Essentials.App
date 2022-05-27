import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ToastController } from "@ionic/angular";
import { BehaviorSubject, Subscription } from "rxjs";
import { Logger } from "src/app/logger";
import { App } from "src/app/model/app.enum";
import { GlobalDIDSessionsService } from "src/app/services/global.didsessions.service";
import { GlobalIntentService } from "src/app/services/global.intent.service";
import { GlobalNavService } from "src/app/services/global.nav.service";
import { GlobalStorageService } from "src/app/services/global.storage.service";
import { EVMNetwork } from "src/app/wallet/model/networks/evms/evm.network";
import { WalletNetworkService } from "src/app/wallet/services/network.service";
import { environment } from "src/environments/environment";
import { GrabbedPacket, GrabRequest, GrabResponse, GrabStatus, PacketWinner } from "../model/grab.model";
import {
  Packet,
  PacketToCreate,
  SerializedPacket
} from "../model/packets.model";

@Injectable({
  providedIn: 'root'
})
export class PacketService {
  private intentSubscription: Subscription;

  private myPackets: Packet[]; // List of packets created by this user.

  public grabbedPackets = new BehaviorSubject<GrabbedPacket[]>([]); // List of packets already grabbed before (so we don't retry).
  public publicPackets = new BehaviorSubject<Packet[]>([]);

  constructor(
    private http: HttpClient,
    private toastController: ToastController,
    private globalIntentService: GlobalIntentService,
    private globalNavService: GlobalNavService,
    private walletNetworkService: WalletNetworkService,
    private storage: GlobalStorageService
  ) { }

  public async onUserSignIn(): Promise<void> {
    //await this.dev_clearLocalStorage(); // Development only

    await this.loadMyPackets();
    await this.loadGrabbedPackets();

    this.intentSubscription = this.globalIntentService.intentListener.subscribe(receivedIntent => {
      if (receivedIntent && receivedIntent.action.startsWith(`${environment.RedPackets.webUrl}/p`) && "g" in receivedIntent.params) {
        // Send the intent response immediatelly
        void this.globalIntentService.sendIntentResponse({}, receivedIntent.intentId, false);
        this.handleGrabRequest(receivedIntent.params["g"]);
      }
    });

    // Load public packets asynchrinously
    void this.fetchPublicPackets();
  }

  public onUserSignOut() {
    if (this.intentSubscription)
      this.intentSubscription.unsubscribe();

    this.publicPackets.next([]);
    this.grabbedPackets.next([]);
  }

  private async dev_clearLocalStorage(): Promise<void> {
    await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "redpackets", "grabbedpackets", []);
    await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "redpackets", "mypackets", []);
  }

  /**
   * Intent request to grab a packet
   *
   * Grab url example: https://packet.fun/p?g=123f41a15a6047d1bd2a1620e50adbe4
   */
  private handleGrabRequest(packetHash: string) {
    Logger.log("redpackets", "Handling red packet grab request for packet hash " + packetHash);
    void this.globalNavService.navigateTo(App.RED_PACKETS, "/redpackets/packet-details", {
      state: {
        packetHash
      }
    });
  }

  createPacket(packet: PacketToCreate): Promise<Packet> {
    Logger.log('redpackets', 'Creating packet on the backend', packet);

    return new Promise((resolve, reject) => {
      // Create a new packet
      this.http.post<SerializedPacket>(`${environment.RedPackets.serviceUrl}/packets`, packet).subscribe(createdPacket => {
        Logger.log("Created packet:", createdPacket);
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
      let response = await this.http.post(`${environment.RedPackets.serviceUrl}/packets/${packetHash}/checkpayments`, {}).toPromise();
      console.log("check payment response", response);
    }
    catch (err) {
      Logger.error("redpackets", "Check payment request failure", err);
    }
  }

  public async getPacketInfo(packetHash: string): Promise<Packet> {
    try {
      let packetInfo = await this.http.get<SerializedPacket>(`${environment.RedPackets.serviceUrl}/packets/${packetHash}`, {}).toPromise();
      if (packetInfo) {
        return Packet.fromSerializedPacket(packetInfo);
      }
    }
    catch (err) {
      Logger.error("redpackets", "Get packet info request failure", err);
      return null;
    }
  }

  public async getPacketWinners(packetHash: string): Promise<PacketWinner[]> {
    try {
      let winners = await this.http.get<PacketWinner[]>(`${environment.RedPackets.serviceUrl}/packets/${packetHash}/winners`, {}).toPromise();
      Logger.log("redpackets", "Packet winners", winners);
      return winners;
    }
    catch (err) {
      Logger.error("redpackets", "Get packet info request failure", err);
      return null;
    }
  }

  public async fetchPublicPackets(): Promise<void> {
    try {
      let packets = await this.http.get<SerializedPacket[]>(`${environment.RedPackets.serviceUrl}/publicpackets`, {}).toPromise();
      if (packets) {
        let deserializedPackets: Packet[] = [];
        packets.forEach(p => {
          deserializedPackets.push(Packet.fromSerializedPacket(p))
        });

        // Filter out some unwanted public packets
        deserializedPackets = this.removeUnsupportedPublicPackets(deserializedPackets);

        Logger.log("redpackets", "Got public packets", deserializedPackets);
        this.publicPackets.next(deserializedPackets);
      }
    }
    catch (err) {
      Logger.error("redpackets", "Get public packets request failure", err);
      this.publicPackets.next([]);
    }
  }

  /**
   * Keep only packets that can be handled by the active network template. Eg: packet for "mainnet"
   * networks when essentials is running on the mainnet template, etc.
   * Goal: avoid showing testnet public packets to mainnet users.
   */
  private removeUnsupportedPublicPackets(packets: Packet[]): Packet[] {
    let availableNetworks = this.walletNetworkService.getAvailableNetworks();
    let displayableEVMChainIds = availableNetworks
      .filter(n => n instanceof EVMNetwork)
      .map(n => (<EVMNetwork>n).getMainChainID())
      .filter(chainId => chainId !== -1);

    return packets.filter(p => displayableEVMChainIds.indexOf(p.chainId) >= 0);
  }

  /**
   * Tells if the given packet hash is in our local list of opened packets
   */
  public wasPacketOpened(packetHash: string): boolean {
    return !!this.grabbedPackets.value.find(p =>
      p.packet.hash === packetHash &&
      (p.status === GrabStatus.GRABBED || p.status === GrabStatus.MISSED || p.status === GrabStatus.DEPLETED
      ));
  }

  public async createGrabPacketRequest(packet: Packet, walletAddress: string): Promise<GrabResponse> {
    Logger.log('redpackets', 'Grabbing packet', packet.hash, walletAddress);
    try {
      let grabRequest: GrabRequest = {
        walletAddress
      };
      let grabResponse = await this.http.post<GrabResponse>(`${environment.RedPackets.serviceUrl}/packets/${packet.hash}/grab`, grabRequest).toPromise();
      Logger.log('redpackets', 'Grab packet response', grabResponse);

      // "Depleted" can be received instantly and must be saved to know that we tried to "open" the packet.
      if (grabResponse.status === GrabStatus.DEPLETED) {
        await this.saveGrabbedPacket(packet, grabResponse.status, grabResponse.earnedAmount);
      }

      return grabResponse;
    }
    catch (err) {
      Logger.error("redpackets", "Grab packet request failure", err);
      return null;
    }
  }

  public async createGrabCaptchaVerification(packet: Packet, previousGrabResponse: GrabResponse, captchaString: string, walletAddress: string, userDID?: string): Promise<GrabResponse> {
    Logger.log('redpackets', 'Sending captcha verification');
    try {
      let grabRequest: GrabRequest = {
        token: previousGrabResponse.token,
        captchaResponse: captchaString,
        walletAddress,
        userDID
      };
      let grabResponse = await this.http.post<GrabResponse>(`${environment.RedPackets.serviceUrl}/packets/${packet.hash}/grab`, grabRequest).toPromise();
      Logger.log('redpackets', 'Grab packet with captcha response', grabResponse);

      // Save the "grabbed" (won or lost) status so we don't try to fetch again later
      if (grabResponse.status === GrabStatus.GRABBED ||
        grabResponse.status === GrabStatus.MISSED ||
        grabResponse.status === GrabStatus.DEPLETED) {
        await this.saveGrabbedPacket(packet, grabResponse.status, grabResponse.earnedAmount);
      }

      return grabResponse;
    }
    catch (err) {
      if (err instanceof HttpErrorResponse) {
        if (err.status == 429) { // Too many requests - IP rate limitation
          return {
            status: GrabStatus.TOO_MANY_REQUEST
          };
        }
      }

      // All other cases
      Logger.error("redpackets", "Grab packet with captcha request failure", err);
      return null;
    }
  }

  private async saveGrabbedPacket(packet: Packet, status: GrabStatus, earnedAmount: string): Promise<void> {
    // Insert at position 0 to keep the most recently created packet first
    let grabbedPackets = this.grabbedPackets.value;
    grabbedPackets.splice(0, 0, {
      packet: packet.serialize(),
      status,
      earnedAmount
    });
    await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "redpackets", "grabbedpackets", grabbedPackets);

    this.grabbedPackets.next(grabbedPackets);
  }

  private async loadGrabbedPackets(): Promise<void> {
    this.grabbedPackets.next(await this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, "redpackets", "grabbedpackets", []));
  }

  public getGrabbedPacket(hash: string): GrabbedPacket {
    return this.grabbedPackets.value.find(p => p.packet && p.packet.hash === hash);
  }

  public packetAlreadyGrabbed(hash: string): boolean {
    return !!this.getGrabbedPacket(hash);
  }

  public getOpenedPackets(): Packet[] {
    // Note: filtering for undefined "packet" in grabbed packets - normally not needed, but legacy bug
    return this.grabbedPackets.value.filter(gp => gp.packet).map(gp => Packet.fromSerializedPacket(gp.packet));
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

  public updateToMyPackets(packet: Packet): Promise<void> {
    let packetIndex = this.myPackets.findIndex(p => p.hash === packet.hash);
    if (packetIndex < 0) {
      Logger.warn("redpackets", `Cannot find packet ${packet.hash} to update it`);
      return;
    }

    // Remove, and re-insert at index 0 (modified = 'recent')
    this.myPackets.splice(packetIndex, 1);
    return this.addToMyPackets(packet);
  }
}
