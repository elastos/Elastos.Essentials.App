import { Injectable } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { GlobalNativeService } from 'src/app/services/global.native.service';

@Injectable({
    providedIn: 'root'
})
export class PopupService {

  constructor(private native: GlobalNativeService) {}

  public async showLoading(message: string): Promise<void> {
    await this.native.showLoading(message);
  }

  public async hideLoading() {
    await this.native.hideLoading();
  }
}