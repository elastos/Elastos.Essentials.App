import { BehaviorSubject } from "rxjs";
import { WalletConnectSessionExtension } from "src/app/model/walletconnect/types";
import { GlobalStorageService } from "../global.storage.service";
import { DIDSessionsStore } from "../stores/didsessions.store";
import { NetworkTemplateStore } from "../stores/networktemplate.store";
import { WalletConnectInstance, WalletConnectV1Instance, WalletConnectV2Instance } from "./instances";

class WalletConnectStore {
  public wcInstances = new BehaviorSubject<WalletConnectInstance[]>([]); // List of initialized WalletConnect instances.

  public getV1Instances(): WalletConnectV1Instance[] {
    return <WalletConnectV1Instance[]>this.wcInstances.value.filter(i => i instanceof WalletConnectV1Instance);
  }

  public getV2Instances(): WalletConnectV2Instance[] {
    return <WalletConnectV2Instance[]>this.wcInstances.value.filter(i => i instanceof WalletConnectV2Instance);
  }

  /**
   * gets instance by PAIRING id.
   */
  public findById(id: string): WalletConnectInstance {
    return this.wcInstances.value.find(i => i.id === id);
  }

  public add(instance: WalletConnectInstance) {
    let instances = this.wcInstances.value;
    instances.push(instance);
    this.wcInstances.next(instances);
  }

  public delete(instance: WalletConnectInstance) {
    let instances = this.wcInstances.value.filter(i => i.id !== instance.id);
    this.wcInstances.next(instances);
  }

  public async loadSessionExtension(sessionKey: string): Promise<WalletConnectSessionExtension> {
    let storageKey = "session_extension_" + sessionKey;
    let extension = await GlobalStorageService.instance.getSetting<WalletConnectSessionExtension>(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "walletconnect", storageKey, {});
    return extension;
  }

  public async saveSessionExtension(sessionKey: string, extension: WalletConnectSessionExtension) {
    let storageKey = "session_extension_" + sessionKey;
    await GlobalStorageService.instance.setSetting(DIDSessionsStore.signedInDIDString, NetworkTemplateStore.networkTemplate, "walletconnect", storageKey, extension);
  }
}

export const walletConnectStore = new WalletConnectStore();