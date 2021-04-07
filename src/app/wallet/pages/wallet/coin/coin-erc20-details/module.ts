import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { CoinErc20DetailsPage } from './coin-erc20-details.page';
import { QRCodeModule } from 'angularx-qrcode';

@NgModule({
    declarations: [CoinErc20DetailsPage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        FormsModule,
        IonicModule,
        QRCodeModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: CoinErc20DetailsPage }])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CoinERC20DetailsModule {}