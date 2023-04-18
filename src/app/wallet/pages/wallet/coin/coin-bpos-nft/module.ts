import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { CoinBPoSNFTPage } from './coin-bpos-nft.page';

@NgModule({
    declarations: [CoinBPoSNFTPage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        InlineSVGModule,
        RouterModule.forChild([{ path: '', component: CoinBPoSNFTPage }])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CoinBPoSNFTModule { }