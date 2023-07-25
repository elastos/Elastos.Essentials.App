import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { GlobalDirectivesModule } from 'src/app/helpers/directives/module';
import { ComponentsModule } from 'src/app/wallet/components/components.module';
import { CoinNFTDetailsPage } from './coin-nft-details.page';

@NgModule({
    declarations: [CoinNFTDetailsPage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        ComponentsModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        GlobalDirectivesModule,
        RouterModule.forChild([{ path: '', component: CoinNFTDetailsPage }])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CoinNFTDetailsModule { }