import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { TranslateModule } from "@ngx-translate/core";
import { QRCodeModule } from "angularx-qrcode";
import { CredentialComponent } from "./credential/credential.component";
import { PrintoptionsComponent } from "./printoptions/printoptions.component";
import { PublishDIDComponent } from "./publish-did/publish-did.component";
import { PublishModeComponent } from "./publishmode/publishmode.component";
import { ShowQRCodeComponent } from "./showqrcode/showqrcode.component";
;

@NgModule({
  declarations: [
    ShowQRCodeComponent,
    PrintoptionsComponent,
    PublishModeComponent,
    PublishDIDComponent,
    CredentialComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    QRCodeModule
  ],
  exports: [
    ShowQRCodeComponent,
    PrintoptionsComponent,
    PublishModeComponent,
    PublishDIDComponent,
    CredentialComponent
  ],
  providers: []
})
export class ComponentsModule { }
