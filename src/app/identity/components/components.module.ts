import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { FormsModule } from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";;
import { ShowQRCodeComponent } from "./showqrcode/showqrcode.component";
import { QRCodeModule } from "angularx-qrcode";
import { PrintoptionsComponent } from "./printoptions/printoptions.component";
import { SuccessComponent } from "./success/success.component";


@NgModule({
  declarations: [
    ShowQRCodeComponent,
    PrintoptionsComponent
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
    PrintoptionsComponent
  ],
  providers: [
  ],
  entryComponents: [
    PrintoptionsComponent
  ],
})
export class ComponentsModule {}
