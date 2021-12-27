import { Injectable } from '@angular/core';
import { IdentityEntry } from 'src/app/services/global.didsessions.service';
import { GlobalService, GlobalServiceManager } from 'src/app/services/global.service.manager';
import { PaymentService } from './payment.service';

@Injectable({
  providedIn: 'root'
})
export class RedPacketsInitService extends GlobalService {
  constructor(
    private paymentsService: PaymentService
  ) {
    super();
  }

  public init(): Promise<void> {
    GlobalServiceManager.getInstance().registerService(this);
    this.paymentsService.init();
    return;
  }

  public onUserSignIn(signedInIdentity: IdentityEntry): Promise<void> {
    return;
  }

  public onUserSignOut(): Promise<void> {
    return;
  }
}
