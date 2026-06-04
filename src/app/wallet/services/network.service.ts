/*
 * Copyright (c) 2021 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Injectable } from '@angular/core';
import moment from 'moment';
import { BehaviorSubject } from 'rxjs';
import { Logger } from 'src/app/logger';
import { GlobalEvents } from 'src/app/services/global.events.service';
import { GlobalFirebaseService } from 'src/app/services/global.firebase.service';
import { GlobalNetworksService } from 'src/app/services/global.networks.service';
import { GlobalStorageService } from 'src/app/services/global.storage.service';
import { DIDSessionsStore } from 'src/app/services/stores/didsessions.store';
import { NetworkTemplateStore } from 'src/app/services/stores/networktemplate.store';
import type { MasterWallet } from '../model/masterwallets/masterwallet';
import { BTCNetworkBase } from '../model/networks/btc/network/btc.base.network';
import type { EVMNetwork } from '../model/networks/evms/evm.network';
import type { AnyNetwork } from '../model/networks/network';
import type { RPCUrlProvider } from '../model/rpc-url-provider';
import { Native } from './native.service';
import { LocalStorage } from './storage.service';

export type PriorityNetworkChangeCallback = (newNetwork) => Promise<void>;

export type BuiltinNetworkOverride = {
  networkKey: string;
  name?: string; // Optional override for network name
  customRpcUrls?: RPCUrlProvider[]; // User's custom RPC URLs (in addition to built-in ones)
  selectedRpcUrl?: string; // Selected RPC URL (can be from built-in or custom)
};

type RawLastUsedNetworks = { [networkKey: string]: number };

export type LastUsedNetworks = {
  raw: RawLastUsedNetworks; // map of network key -> last used timestamp
  list: {
    // Based on the raw entries, ordered list of networks.
    network: AnyNetwork;
    timestamp: number;
  }[];
};

@Injectable({
  providedIn: 'root'
})
export class WalletNetworkService {
  public static instance: WalletNetworkService = null;

  private networks: AnyNetwork[] = [];
  private networkVisibilities: {
    [networkKey: string]: boolean; // Key value of network key -> visible in network chooser or not.
  } = {};
  private builtinNetworkOverrides: { [networkKey: string]: BuiltinNetworkOverride } = {};

  public activeNetwork = new BehaviorSubject<AnyNetwork>(null);
  public lastUsedNetworks = new BehaviorSubject<LastUsedNetworks>({
    raw: {},
    list: []
  });

  /** Notifies whenever the networks list changes (initial registration, custom networks added/removed) */
  public networksList = new BehaviorSubject<AnyNetwork[]>([]);

  private priorityNetworkChangeCallback?: PriorityNetworkChangeCallback = null;

  constructor(
    public events: GlobalEvents,
    public native: Native,
    private globalNetworksService: GlobalNetworksService,
    private globalStorageService: GlobalStorageService,
    private globalFirebaseService: GlobalFirebaseService,
    private localStorage: LocalStorage
  ) {
    WalletNetworkService.instance = this;
  }

  /**
   * Called every time a user signs in
   */
  public async init(): Promise<void> {
    this.networks = [];
    await this.loadNetworkVisibilities();
    await this.loadBuiltinNetworkOverrides();
  }

  /**
   * Called every time a user signs out
   */
  public stop() {
    this.networks = [];
  }

  /**
   * Appends a usable network to the list. We let networks register themselves, we don't
   * use networks in this service, to avoid circular dependencies.
   */
  public async registerNetwork(network: AnyNetwork, useAsDefault = false): Promise<void> {
    this.networks.push(network);

    let savedNetworkKey = (await this.localStorage.get('activenetwork')) as string;
    const savedNetwork = await this.getNetworkByKey(savedNetworkKey);
    if (this.globalNetworksService.activeNetworkTemplate.value === network.networkTemplate) {
      if (!savedNetwork && useAsDefault) {
        Logger.log('wallet', 'WalletNetworkService - Using default network:', network);
        await this.notifyNetworkChange(network); // Normally, elastos
      } else if (savedNetworkKey && savedNetworkKey === network.key) {
        Logger.log('wallet', 'WalletNetworkService - Reloading network:', savedNetwork);
        await this.notifyNetworkChange(savedNetwork);
      }
    }

    // Order networks list alphabetically
    this.networks.sort((a, b) => {
      return a.getEffectiveName() > b.getEffectiveName() ? 1 : -1;
    });

    this.networksList.next(this.networks);
  }

  /**
   * Called by the boot sequence when all networks are registered, so we know we have the whole networks list from here.
   */
  public notifyAllNetworksRegistered() {
    void this.loadLastUsedNetworks();
  }

  /**
   * Used to remove a custom network from the network instances, when deleting it.
   */
  public removeNetworkByKey(networkKey: string) {
    this.networks.splice(
      this.networks.findIndex(n => n.key === networkKey),
      1
    );
    this.networksList.next(this.networks);
  }

  /**
   * Returns the list of all networks.
   * Possibly filter out some unsupported networks:
   * eg: do not support the BTC network when the wallet is imported by EVM private key.
   */
  public getAvailableNetworks(masterWallet: MasterWallet = null, networkTemplate: string = null): AnyNetwork[] {
    if (!networkTemplate) {
      networkTemplate = this.globalNetworksService.activeNetworkTemplate.value;
    }

    // Keep only networks for the target network template.
    let networks = this.networks.filter(n => n.networkTemplate === networkTemplate);

    if (masterWallet) {
      networks = networks.filter(n => masterWallet.supportsNetwork(n));
    }

    // Define hardcoded preferred network keys that should appear first
    const preferredNetworkKeys = [
      'elastos',
      'elastoseco',
      'elastosecopgp',
      'btc',
      'bsc',
      'ethereum',
      'elastossmartchain',
      'elastosidchain'
    ];

    // Separate preferred networks (maintaining hardcoded order) and remaining networks
    const preferredNetworks: AnyNetwork[] = [];
    const remainingNetworks: AnyNetwork[] = [];

    networks.forEach(network => {
      const preferredIndex = preferredNetworkKeys.indexOf(network.key);
      if (preferredIndex >= 0) {
        preferredNetworks[preferredIndex] = network;
      } else {
        remainingNetworks.push(network);
      }
    });

    // Remove undefined entries from preferred networks array (in case some preferred networks don't exist)
    const filteredPreferredNetworks = preferredNetworks.filter(n => n !== undefined);

    // Sort remaining networks alphabetically
    remainingNetworks.sort((a, b) => a.getEffectiveName().localeCompare(b.getEffectiveName()));

    return [...filteredPreferredNetworks, ...remainingNetworks];
  }

  /**
   * Returns the list of available networks, but only for networks that user has chosen
   * to make visible in settings.
   */
  public getDisplayableNetworks(): AnyNetwork[] {
    return this.getAvailableNetworks().filter(n => this.getNetworkVisible(n.key));
  }

  /**
   * Returns chain ids of networks that belong to the given network template (if passed), or by default,
   * to the active network tempplate.
   */
  public getAvailableEVMChainIDs(networkTemplate: string = null): number[] {
    let availableNetworks = this.getAvailableNetworks(null, networkTemplate);
    let displayableEVMChainIds = availableNetworks
      .filter(n => n.isEVMNetwork())
      .map(n => (<EVMNetwork>n).getMainChainID())
      .filter(chainId => chainId !== -1);

    return displayableEVMChainIds;
  }

  /**
   * Callback set by the wallet service to be informed of network change requests before anyone else
   * and rebuild everything needed first.
   */
  public setPriorityNetworkChangeCallback(callback: PriorityNetworkChangeCallback) {
    this.priorityNetworkChangeCallback = callback;
  }

  public resetPriorityNetworkChangeCallback() {
    this.priorityNetworkChangeCallback = null;
  }

  public async setActiveNetwork(network: AnyNetwork) {
    Logger.log('wallet', 'Setting active network to', network);

    // Save choice to local storage
    await this.localStorage.set('activenetwork', network.key);

    // Stats
    void this.globalFirebaseService.logEvent('switch_network_' + network.key);

    // Update the last used date
    void this.updateLastUsedNetworkDate(network);

    await this.notifyNetworkChange(network);
  }

  private async notifyNetworkChange(network: AnyNetwork): Promise<void> {
    // Inform and await the priority callback (wallet service)
    if (this.priorityNetworkChangeCallback) {
      await this.priorityNetworkChangeCallback(network);
      Logger.log('wallet', 'Network change handled by the priority callback. Now telling other listeners');
    }

    // Inform other lower priority listeners
    this.activeNetwork.next(network);
  }

  public getNetworkByKey(key: string, networkTemplate: string = null): AnyNetwork {
    if (!networkTemplate) networkTemplate = this.globalNetworksService.activeNetworkTemplate.value;

    return this.networks.find(n => n.key === key && n.networkTemplate === networkTemplate);
  }

  public getNetworkByChainId(chainId: number): EVMNetwork {
    return this.networks.find(n => n.isEVMNetwork() && (<EVMNetwork>n).getMainChainID() == chainId) as EVMNetwork;
  }

  public getActiveNetworkIndex(): number {
    return this.networks.findIndex(n => {
      return n.key === this.activeNetwork.value.key;
    });
  }

  public getBitcoinNetwork(): BTCNetworkBase {
    return this.networks.find(n => n instanceof BTCNetworkBase) as BTCNetworkBase;
  }

  /**
   * Tells if the currently active network is the elastos network MAICHAIN.
   */
  public isActiveNetworkElastosMainchain(): boolean {
    return this.activeNetwork.value && this.activeNetwork.value.key === 'elastos';
  }

  /**
   * Tells if the currently active network is the elastos mainchain, ESC , ECO or EID.
   */
  public isActiveNetworkElastos(): boolean {
    return (
      this.activeNetwork.value &&
      ['elastos', 'elastossmartchain', 'elastosidchain', 'elastoseco'].includes(this.activeNetwork.value.key)
    );
  }

  /**
   * Tells if the currently active network is the EVM network.
   */
  public isActiveNetworkEVM(): boolean {
    return this.activeNetwork.value && this.activeNetwork.value.isEVMNetwork();
  }

  public async loadNetworkVisibilities(): Promise<void> {
    this.networkVisibilities = await this.globalStorageService.getSetting(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'wallet',
      'network-visibilities',
      {}
    );
  }

  public saveNetworkVisibilities(): Promise<void> {
    return this.globalStorageService.setSetting(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'wallet',
      'network-visibilities',
      this.networkVisibilities
    );
  }

  public async loadBuiltinNetworkOverrides(): Promise<void> {
    this.builtinNetworkOverrides = await this.globalStorageService.getSetting(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'wallet',
      'builtin-network-overrides',
      {}
    );
  }

  public saveBuiltinNetworkOverrides(): Promise<void> {
    return this.globalStorageService.setSetting(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'wallet',
      'builtin-network-overrides',
      this.builtinNetworkOverrides
    );
  }

  public getNetworkVisible(networkKey: string): boolean {
    // Default networks that should be visible to new users
    const defaultVisibleNetworks = [
      'elastos',
      'elastoseco',
      'elastosecopgp',
      'elastossmartchain',
      'elastosidchain',
      'ethereum',
      'bsc',
      'tron',
      'btc',
      'polygon',
      'arbitrum',
      'avalanchecchain'
    ];

    // If user has explicitly set visibility, use that preference
    if (networkKey in this.networkVisibilities) {
      return this.networkVisibilities[networkKey];
    }

    // Otherwise, check if it's in the default visible list
    if (defaultVisibleNetworks.includes(networkKey)) {
      return true;
    }

    // If not in visibilities and not in defaults, hide by default
    return false;
  }

  public setNetworkVisible(networkKey: string, visible: boolean): Promise<void> {
    this.networkVisibilities[networkKey] = visible;
    return this.saveNetworkVisibilities();
  }

  public getBuiltinNetworkOverride(networkKey: string): BuiltinNetworkOverride | null {
    return this.builtinNetworkOverrides[networkKey] || null;
  }

  public setBuiltinNetworkOverride(networkKey: string, override: BuiltinNetworkOverride): Promise<void> {
    this.builtinNetworkOverrides[networkKey] = override;
    return this.saveBuiltinNetworkOverrides();
  }

  public removeBuiltinNetworkOverride(networkKey: string): Promise<void> {
    if (this.builtinNetworkOverrides[networkKey]) {
      delete this.builtinNetworkOverrides[networkKey];
      return this.saveBuiltinNetworkOverrides();
    }
    return Promise.resolve();
  }

  /**
   * Returns the effective network name, considering any override
   */
  public getEffectiveNetworkName(network: AnyNetwork): string {
    const override = this.getBuiltinNetworkOverride(network.key);
    return override?.name || network.getDefaultName();
  }

  /**
   * Returns the selected RPC URL from network overrides, if any.
   */
  public getOverridenNetworkRpcUrl(network: AnyNetwork): string {
    const override = this.getBuiltinNetworkOverride(network.key);
    return override?.selectedRpcUrl;
  }

  /**
   * Returns the custom RPC URLs for a built-in network.
   */
  public getCustomRpcUrls(networkKey: string): RPCUrlProvider[] {
    const override = this.getBuiltinNetworkOverride(networkKey);
    return override?.customRpcUrls || [];
  }

  /**
   * Sets the custom RPC URLs for a built-in network.
   */
  public setCustomRpcUrls(networkKey: string, customRpcUrls: RPCUrlProvider[]): Promise<void> {
    const override = this.getBuiltinNetworkOverride(networkKey) || { networkKey };
    override.customRpcUrls = customRpcUrls;
    return this.setBuiltinNetworkOverride(networkKey, override);
  }

  /**
   * Adds a custom RPC provider to a built-in network.
   */
  public addCustomRpcUrl(networkKey: string, rpcProvider: RPCUrlProvider): Promise<void> {
    const customRpcUrls = this.getCustomRpcUrls(networkKey);

    // Check if URL already exists
    if (customRpcUrls.some(p => p.url === rpcProvider.url)) {
      return Promise.resolve(); // Already exists, no-op
    }

    customRpcUrls.push(rpcProvider);
    return this.setCustomRpcUrls(networkKey, customRpcUrls);
  }

  /**
   * Removes a custom RPC provider from a built-in network.
   */
  public removeCustomRpcUrl(networkKey: string, rpcUrl: string): Promise<void> {
    const customRpcUrls = this.getCustomRpcUrls(networkKey);
    const filteredUrls = customRpcUrls.filter(p => p.url !== rpcUrl);
    return this.setCustomRpcUrls(networkKey, filteredUrls);
  }

  /**
   * Sets the selected RPC URL for a built-in network.
   */
  public setSelectedRpcUrl(networkKey: string, selectedRpcUrl: string): Promise<void> {
    const override = this.getBuiltinNetworkOverride(networkKey) || { networkKey };
    override.selectedRpcUrl = selectedRpcUrl;
    return this.setBuiltinNetworkOverride(networkKey, override);
  }

  /**
   * Gets the selected RPC URL for a built-in network, or null if none selected.
   */
  public getSelectedRpcUrl(networkKey: string): string | null {
    const override = this.getBuiltinNetworkOverride(networkKey);
    return override?.selectedRpcUrl || null;
  }

  /**
   * Maintain the list of last used networks to be able to display them first in some
   * lists of widgets like the active network chooser.
   */
  private async updateLastUsedNetworkDate(network: AnyNetwork) {
    let rawLastUsedNetworks = this.lastUsedNetworks.value.raw;

    rawLastUsedNetworks[network.key] = moment().unix();
    await this.saveLastUsedNetworks(rawLastUsedNetworks);

    this.lastUsedNetworks.next(this.newLastUsedNetworks(rawLastUsedNetworks));
  }

  private saveLastUsedNetworks(rawLastUsedNetworks: RawLastUsedNetworks) {
    return this.globalStorageService.setSetting(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'wallet',
      'last-used-networks',
      rawLastUsedNetworks
    );
  }

  private async loadLastUsedNetworks() {
    let rawLastUsedNetworks = await this.globalStorageService.getSetting(
      DIDSessionsStore.signedInDIDString,
      NetworkTemplateStore.networkTemplate,
      'wallet',
      'last-used-networks',
      {}
    );

    this.lastUsedNetworks.next(this.newLastUsedNetworks(rawLastUsedNetworks));
  }

  private newLastUsedNetworks(rawLastUsedNetworks: RawLastUsedNetworks): LastUsedNetworks {
    let sortedRawKeys = Object.keys(rawLastUsedNetworks).sort((a, b) => {
      return rawLastUsedNetworks[b] - rawLastUsedNetworks[a];
    });

    let lastUsedNetworks: LastUsedNetworks = {
      raw: rawLastUsedNetworks,
      list: []
    };
    for (let networkKey of sortedRawKeys) {
      let network = this.getNetworkByKey(networkKey);
      if (network) {
        lastUsedNetworks.list.push({
          network,
          timestamp: rawLastUsedNetworks[networkKey]
        });
      }
    }

    return lastUsedNetworks;
  }
}
