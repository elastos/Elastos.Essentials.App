import { CommonModule } from "@angular/common";
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { TranslateModule } from "@ngx-translate/core";

import { SharedComponentsModule } from "src/app/components/sharedcomponents.module";
import { AccountAbstractionCreatePage } from "./create/account-abstraction-create.page";
import { AAModuleRoutingModule } from "./routing";

@NgModule({
  imports: [
    SharedComponentsModule,
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    AAModuleRoutingModule,
  ],
  declarations: [AccountAbstractionCreatePage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AccountAbstractionModule {}
