import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { FormsModule } from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";;
import { ShowQRCodeComponent } from "./showqrcode/showqrcode.component";
import { QRCodeModule } from "angularx-qrcode";


@NgModule({
  declarations: [
    ShowQRCodeComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    QRCodeModule,
  ],
  exports: [
    ShowQRCodeComponent,
  ],
  providers: [],
  entryComponents: [
  ],
})
export class ComponentsModule {}
