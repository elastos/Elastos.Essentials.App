import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { Platform, ToastController } from '@ionic/angular';
import BigNumber from 'bignumber.js';
import { GlobalConfig } from 'src/app/config/globalconfig';
import { Logger } from 'src/app/logger';
import { AnySubWallet } from 'src/app/wallet/model/wallets/subwallet';
import { deserializeCosts, PacketCosts, SerializablePacketCosts } from '../model/packetcosts.model';
import { CreatedPacket, Packet } from '../model/packets.model';

@Injectable({
  providedIn: 'root'
})
export class PacketService {
  private preparedPacket: Packet = null;
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

  /**
   * Saves the given packet as being prepared. The received packet already contains all the needed
   * info. This info is saved and used for the payment step.
   */
  public preparePacket(packet: Packet, subWallet: AnySubWallet) {
    this.preparedPacket = packet;
    this.preparedPacketSubWallet = subWallet;

    Logger.log("redpackets", "Preparing packet:", packet);
  }

  public getPreparedPacket(): Packet {
    return this.preparedPacket;
  }

  public getPreparedPacketSubWallet(): AnySubWallet {
    return this.preparedPacketSubWallet;
  }

  /**
   * Compute detailed costs in TOKEN and in NATIVE COIN for the prepared packet.
   *
   * - standardServiceFees: 0.5 USD worth of native coin
   */
  /* public async computeCosts(): Promise<PacketCosts> {
    let costs: PacketCosts = {
      nativeToken: {
        redPacket: new BigNumber(0),
        transactionFees: new BigNumber(0),
        standardServiceFeesUSD: new BigNumber(0.5),
        standardServiceFees: new BigNumber(0),
        options: {
          publicPacketFees: new BigNumber(0)
        },
        total: new BigNumber(0)
      }
    };

    if (!this.preparePacket) {
      Logger.error("redpackets", "Packet costs can't be computed without a prepared packet!");
      return costs;
    }

    // Native or ERC packet?
    if (this.preparedPacketSubWallet instanceof ERC20SubWallet) {
      // ERC20 token in the packet
      costs.erc20Token = {
        redPacket: new BigNumber(0),
        options: {
          publicPacketFees: new BigNumber(0)
        },
        total: new BigNumber(0)
      };

      costs.erc20Token.redPacket = this.preparedPacket.value;
      costs.erc20Token.total = costs.erc20Token.total.plus(costs.erc20Token.redPacket);
      // public option TODO

      // Estimated native coin transaction fees
      let singleTransferCost = await this.packetERC20TransferFeesCost();
      costs.nativeToken.transactionFees = singleTransferCost.multipliedBy(this.preparedPacket.quantity);
      costs.nativeToken.total = costs.nativeToken.total.plus(costs.nativeToken.transactionFees);

      // Service fees in native coin
      let standardEvmSubwallet = this.preparedPacketSubWallet.networkWallet.getMainEvmSubWallet();
      costs.nativeToken.standardServiceFees = costs.nativeToken.standardServiceFeesUSD.dividedBy(standardEvmSubwallet.getOneCoinUSDValue());
      costs.nativeToken.total = costs.nativeToken.total.plus(costs.nativeToken.standardServiceFees);
    }
    else {
      // Native token in the wallet
      costs.nativeToken.redPacket = this.preparedPacket.value;
      costs.nativeToken.total = costs.nativeToken.total.plus(costs.nativeToken.redPacket);

      // Estimated native coin transaction fees
      let singleTransferCost = await this.packetNativeCoinTransferFeesCost();
      costs.nativeToken.transactionFees = singleTransferCost.multipliedBy(this.preparedPacket.quantity);
      costs.nativeToken.total = costs.nativeToken.total.plus(costs.nativeToken.transactionFees);

      // Service fees in native coin
      costs.nativeToken.standardServiceFees = costs.nativeToken.standardServiceFeesUSD.dividedBy(this.preparedPacketSubWallet.getOneCoinUSDValue());
      costs.nativeToken.total = costs.nativeToken.total.plus(costs.nativeToken.standardServiceFees);
    }

    //console.log("total", costs.nativeToken.total.toString())

    return costs;
  } */

  /**
   * Estimates the cost to transfer a red packet ERC20 amount to a winning user.
   */
  private async packetERC20TransferFeesCost(): Promise<BigNumber> {
    // Estimate gas cost in native coin, for a "transfer" ERC20 contract call
    // TODO
    return await new BigNumber(0.002);
  }

  // TODO: getGasPrice + For native coins, the gas is 21000 for most cases
  private async packetNativeCoinTransferFeesCost(): Promise<BigNumber> {
    // Native coin - get native coin cost to send a payment
    // TODO
    return await new BigNumber(0.002);
  }

  createPacket(packet: Packet): Promise<CreatedPacket<PacketCosts>> {
    Logger.log('redpackets', 'Creating packet on backend', packet);

    return new Promise((resolve, reject) => {
      // Create a new packet
      this.http.post<CreatedPacket<SerializablePacketCosts>>(`${GlobalConfig.RedPackets.serviceUrl}/packets`, packet).subscribe(createdPacket => {
        console.log("createdPacket", createdPacket);
        if (createdPacket) {
          resolve({
            request: createdPacket.request,
            hash: createdPacket.hash,
            paymentAddress: createdPacket.paymentAddress,
            costs: deserializeCosts(createdPacket.costs)
          });
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
