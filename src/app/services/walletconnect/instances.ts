
import WalletConnect from "@walletconnect/client";
import { PairingTypes } from "@walletconnect/types";
import { WalletConnectSessionExtension } from "src/app/model/walletconnect/types";
import { WalletConnectV1Service } from "./walletconnect.v1.service";
import { WalletConnectV2Service } from "./walletconnect.v2.service";

export abstract class WalletConnectInstance {
  // Extended info by Essentials
  sessionExtension: WalletConnectSessionExtension;

  constructor(sessionExtension: WalletConnectSessionExtension) {
    this.sessionExtension = sessionExtension;
  }

  public abstract get id(): string; // Unique identifier among its peers, to distinguish different instances of the same WC version. => connector.key for v1, pairing topic for v2
  public abstract getName(): string;
  public abstract getLogo(): string;
  public abstract getDescription(): string;
  public abstract getUrl(): string;

  public abstract killSession(): Promise<void>;
}

export class WalletConnectV1Instance extends WalletConnectInstance {
  wc: WalletConnect;

  constructor(connector: WalletConnect, sessionExtension: WalletConnectSessionExtension) {
    super(sessionExtension);
    this.wc = connector;
  }

  public get id(): string {
    return this.wc.key;
  }

  public getName(): string {
    if (this.wc.peerMeta)
      return this.wc.peerMeta.name;
    else
      return "Unknown session";
  }

  public getLogo(): string {
    if (!this.wc || !this.wc.peerMeta || !this.wc.peerMeta.icons || this.wc.peerMeta.icons.length == 0)
      return 'assets/settings/icon/walletconnect.svg';

    return this.wc.peerMeta.icons[0];
  }

  public getDescription(): string {
    if (!this.wc || !this.wc.peerMeta || !this.wc.peerMeta.description)
      return null;

    return this.wc.peerMeta.description;
  }

  public getUrl(): string {
    if (!this.wc || !this.wc.peerMeta || !this.wc.peerMeta.url)
      return null;

    return this.wc.peerMeta.url;
  }

  public async killSession() {
    await WalletConnectV1Service.instance.killSession(this);
  }
}

export class WalletConnectV2Instance extends WalletConnectInstance {
  pairing: PairingTypes.Struct;

  constructor(pairing: PairingTypes.Struct, sessionExtension: WalletConnectSessionExtension) {
    super(sessionExtension);
    this.pairing = pairing;
  }

  public get id(): string {
    return this.pairing.topic;
  }

  public getName(): string {
    if (this.pairing.peerMetadata)
      return this.pairing.peerMetadata.name;
    else
      return "Unknown session";
  }

  public getLogo(): string {
    if (!this.pairing || !this.pairing.peerMetadata || !this.pairing.peerMetadata.icons || this.pairing.peerMetadata.icons.length == 0)
      return 'assets/settings/icon/walletconnect.svg';

    return this.pairing.peerMetadata.icons[0];
  }

  public getDescription(): string {
    if (!this.pairing || !this.pairing.peerMetadata || !this.pairing.peerMetadata.description)
      return null;

    return this.pairing.peerMetadata.description;
  }

  public getUrl(): string {
    if (!this.pairing || !this.pairing.peerMetadata || !this.pairing.peerMetadata.url)
      return null;

    return this.pairing.peerMetadata.url;
  }

  public async killSession() {
    await WalletConnectV2Service.instance.killSession(this);
  }
}