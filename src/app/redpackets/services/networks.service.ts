import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { environment } from 'src/environments/environment';
import { PublicNetworkInfo } from '../model/networks.model';

@Injectable({
  providedIn: 'root'
})
export class NetworksService {
  private supportedNetworks: PublicNetworkInfo[];

  constructor(
    private http: HttpClient,
    private walletNetworkService: WalletNetworkService
  ) { }

  public async init(): Promise<void> {
    await this.fetchSupportedNetworks();
  }

  /**
   * Gets the list of supported chain IDs from the backend, so we know on which networks
   * we can allow users to created red packets.
   */
  public async fetchSupportedNetworks(): Promise<void> {
    try {
      this.supportedNetworks = await this.http.get<PublicNetworkInfo[]>(`${environment.RedPackets.serviceUrl}/chains`).toPromise();
      if (!this.supportedNetworks) {
        Logger.warn("redpackets", "Unable to fetch supported networks. Red packets can't be created later.");
        this.supportedNetworks = [];
      }
      else {
        Logger.log("redpackets", "Got list of supported networks for red packets", this.supportedNetworks);
      }
    }
    catch (err) {
      Logger.error("redpackets", "Unable to fetch supported networks. Red packets can't be created later.", err);
      this.supportedNetworks = [];
    }
  }

  /**
   * Tells is the currently active network is supported for red packets or not.
   */
  public isActiveNetworkSupported(): boolean {
    let activeNetwork = this.walletNetworkService.activeNetwork.value;
    if (!activeNetwork)
      return false; // Should not happen

    if (!activeNetwork.getMainChainID())
      return false; // No EVM in this network

    return !!this.supportedNetworks.find(network => network.chainId === activeNetwork.getMainChainID());
  }
}
