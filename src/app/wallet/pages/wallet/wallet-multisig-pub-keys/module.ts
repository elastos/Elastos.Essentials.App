import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { QRCodeModule } from 'angularx-qrcode';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { MultiSigPubKeysPage } from './wallet-multisig-pub-keys.page';

@NgModule({
    declarations: [MultiSigPubKeysPage],
    imports: [
        SharedComponentsModule,
        CommonModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        QRCodeModule,
        RouterModule.forChild([{ path: '', component: MultiSigPubKeysPage }])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MultiSigPubKeysModule { }