import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { TranslateModule } from "@ngx-translate/core";
import { QRCodeModule } from "angularx-qrcode";
import { InlineSVGModule } from "ng-inline-svg-2";
import { SharedComponentsModule } from "src/app/components/sharedcomponents.module";
import { CredentialComponent } from "./credential/credential.component";
import { PrintoptionsComponent } from "./printoptions/printoptions.component";
import { PublishDIDComponent } from "./publish-did/publish-did.component";
import { PublishModeComponent } from "./publishmode/publishmode.component";
import { ShowQRCodeComponent } from "./showqrcode/showqrcode.component";
import { WalletChooserComponent } from "./wallet-chooser/wallet-chooser.component";
import { WalletCredentialComponent } from "./wallet-credential/wallet-credential.component";

@NgModule({
  declarations: [
    ShowQRCodeComponent,
    PrintoptionsComponent,
    PublishModeComponent,
    PublishDIDComponent,
    CredentialComponent,
    WalletChooserComponent,
    WalletCredentialComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    SharedComponentsModule,
    QRCodeModule,
    InlineSVGModule
  ],
  exports: [
    ShowQRCodeComponent,
    PrintoptionsComponent,
    PublishModeComponent,
    PublishDIDComponent,
    CredentialComponent,
    WalletChooserComponent,
    WalletCredentialComponent
  ],
  providers: []
})
export class ComponentsModule { }
