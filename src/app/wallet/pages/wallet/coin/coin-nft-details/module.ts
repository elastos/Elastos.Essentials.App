import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { CoinNFTDetailsPage } from './coin-nft-details.page';

@NgModule({
    declarations: [CoinNFTDetailsPage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: CoinNFTDetailsPage }])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CoinNFTDetailsModule {}