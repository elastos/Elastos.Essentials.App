import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ToastController } from "@ionic/angular";
import { BehaviorSubject, Subscription } from "rxjs";
import { Logger } from "src/app/logger";
import { App } from "src/app/model/app.enum";
import { GlobalDIDSessionsService } from "src/app/services/global.didsessions.service";
import { GlobalIntentService } from "src/app/services/global.intent.service";
import { GlobalNavService } from "src/app/services/global.nav.service";
import { GlobalStorageService } from "src/app/services/global.storage.service";
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
  private grabbedPackets: GrabbedPacket[]; // List of packets already grabbed before (so we don't retry).

  public publicPackets = new BehaviorSubject<Packet[]>([]);
  public openedPackets = new BehaviorSubject<Packet[]>([]);

  constructor(
    private http: HttpClient,
    private toastController: ToastController,
    private globalIntentService: GlobalIntentService,
    private globalNavService: GlobalNavService,
    private storage: GlobalStorageService
  ) { }

  public async onUserSignIn(): Promise<void> {
    await this.loadMyPackets();
    await this.loadGrabbedPackets();

    // Load the opened packets
    void this.loadOpenedPackets();

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
    this.intentSubscription.unsubscribe();
    this.publicPackets.next([]);
    this.openedPackets.next([]);
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
   * Get the opened packets
   * Todo: Add proper logic for the opened packet
   */
  public loadOpenedPackets() {
    const packet = Packet.fromSerializedPacket(
      JSON.parse('{"hash":"8e0056aa2183475c8f7d32efb7b8a4ce","packetType":"standard","chainId":20,"quantity":30,"tokenType":"native","value":"0.01","message":"temporary message","distributionType":"random","category":"default","visibility":"link","probability":100,"creatorAddress":"0x58D77Ab2950dac243ae0D995cf9E417cDFC2a0a4","creatorDID":"did:elastos:inEPcZ1pxEYbno8gvfVguafPSpM1vM5oxL","expirationDate":1642438495,"isActive":false,"costs":{"nativeToken":{"redPacket":"0.01","transactionFees":"0.0055986","standardServiceFeesUSD":"0.5","standardServiceFees":"0.1416163658","options":{"publicPacketFees":"0"},"total":"0.1572149658"}},"paymentAddress":"EKbCeX28NA3mjcj3XVFKsQdQJshbLxNxWQ","paymentStatus":{"nativeToken":null,"erc20Token":null},"distributionAmounts":["0.000559898997541751626187960106471819","0.000183146032325347161338055885978615","0.000296981381405274970664964401543223","0.0000523864046972904987855974531619213","0.000404850506628466504570877021869893","0.000619615148353025932105368606644037","0.000311766361546292637642576185341032","0.000466565361360626479732100339945163","0.000277711900014347805431513488480038","0.000545810325360654828927473809745208","0.000337830470098580207015640077367348","0.0001016953890321758817787321686569748","0.0001255205500119588226226816271203745","0.000438257910196942731990031611047934","0.000421474398097059002161833672569796","0.000600349469197044510769649765364822","0.0001346957660272945793449358849736099","0.00001159822480382331703864108556634141","0.000408828992091853390184992530253224","0.0002052557426822264110014589350054321","0.000241562568447427287692554834194381","0.00064067644424243487247935181346964","0.0001418388595368976658114812899609135","0.00057580079733590635356357521543391","0.000590299008621317128280501987547768","0.0003146445978371045397609110186412075","0.0001061281638269068594317647800798986","0.00001277860118366943770059839078084381","0.000217228958048502347766591848242713","0.000654802669447796500975239249996264"],"nativeTokenSymbol":"ELA","blockNumber":10482297,"creationDate":1642179296,"_id":"61e1aae0ec7f5ba5490f1b44"}')
    )
    this.openedPackets.next([packet, packet, packet])
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

  public async createGrabPacketRequest(packetHash: string, walletAddress: string): Promise<GrabResponse> {
    Logger.log('redpackets', 'Grabbing packet', packetHash, walletAddress);
    try {
      let grabRequest: GrabRequest = {
        walletAddress
      };
      let grabResponse = await this.http.post<GrabResponse>(`${environment.RedPackets.serviceUrl}/packets/${packetHash}/grab`, grabRequest).toPromise();
      Logger.log('redpackets', 'Grab packet response', grabResponse);
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
      Logger.error("redpackets", "Grab packet with captcha request failure", err);
      return null;
    }
  }

  private async saveGrabbedPacket(packet: Packet, status: GrabStatus, earnedAmount: string): Promise<void> {
    this.grabbedPackets.push({
      packet: packet.serialize(),
      status,
      earnedAmount
    });
    await this.storage.setSetting(GlobalDIDSessionsService.signedInDIDString, "redpackets", "grabbedpackets", this.grabbedPackets);
  }

  private async loadGrabbedPackets(): Promise<void> {
    this.grabbedPackets = await this.storage.getSetting(GlobalDIDSessionsService.signedInDIDString, "redpackets", "grabbedpackets", []);
  }

  public packetAlreadyGrabbed(hash: string): boolean {
    return !!this.grabbedPackets.find(p => p.packet && p.packet.hash === hash);
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
