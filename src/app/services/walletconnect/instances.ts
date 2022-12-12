
import WalletConnect from "@walletconnect/client";
import { SessionTypes } from "@walletconnect/types";
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
  session: SessionTypes.Struct;

  constructor(session: SessionTypes.Struct, sessionExtension: WalletConnectSessionExtension) {
    super(sessionExtension);
    this.session = session;
  }

  public get id(): string {
    return this.session.topic;
  }

  public getName(): string {
    if (this.session.peer.metadata)
      return this.session.peer.metadata.name;
    else
      return "Unknown session";
  }

  public getLogo(): string {
    if (!this.session || !this.session.peer || !this.session.peer.metadata || !this.session.peer.metadata.icons || this.session.peer.metadata.icons.length == 0)
      return 'assets/settings/icon/walletconnect.svg';

    return this.session.peer.metadata.icons[0];
  }

  public getDescription(): string {
    if (!this.session || !this.session.peer || !this.session.peer.metadata || !this.session.peer.metadata.description)
      return null;

    return this.session.peer.metadata.description;
  }

  public getUrl(): string {
    if (!this.session || !this.session.peer || !this.session.peer.metadata || !this.session.peer.metadata.url)
      return null;

    return this.session.peer.metadata.url;
  }

  public async killSession() {
    await WalletConnectV2Service.instance.killSession(this);
  }
}