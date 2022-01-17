import { Injectable } from '@angular/core';
import { IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { DIDService } from './did.service';
import { PacketService } from './packet.service';
import { PaymentService } from './payment.service';

@Injectable({
  providedIn: 'root'
})
export class RedPacketsInitService extends GlobalService {
  constructor(
    private paymentsService: PaymentService,
    private packetService: PacketService,
    private didService: DIDService
  ) {
    super();
  }

  public init(): Promise<void> {
    GlobalServiceManager.getInstance().registerService(this);
    this.paymentsService.init();
    return;
  }

  public async onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    await this.packetService.onUserSignIn();
    await this.didService.onUserSignIn();
  }

  public async onUserSignOut(): Promise<void> {
    await this.didService.onUserSignOut();
    this.packetService.onUserSignOut();
    return;
  }
}
