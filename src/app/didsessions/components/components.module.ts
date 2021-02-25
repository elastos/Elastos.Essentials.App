import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CreatePasswordComponent } from './createpassword/createpassword.component';
import { ImportDIDSourceComponent } from './importdidsource/importdidsource.component';
import { MnemonicPassCheckComponent } from './mnemonicpasscheck/mnemonicpasscheck.component';
import { EmptyImportedDocumentComponent } from './emptyimporteddocument/emptyimporteddocument.component';
import { DIDButtonComponent } from './did-button/did-button.component';

@NgModule({
  declarations: [
    CreatePasswordComponent,
    ImportDIDSourceComponent,
    MnemonicPassCheckComponent,
    EmptyImportedDocumentComponent,
    DIDButtonComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule
  ],
  exports: [
    CreatePasswordComponent,
    ImportDIDSourceComponent,
    MnemonicPassCheckComponent,
    EmptyImportedDocumentComponent,
    DIDButtonComponent
  ],
  providers: [
    //AdvancedPopupController
  ],
  entryComponents: [
    CreatePasswordComponent,
    ImportDIDSourceComponent,
    MnemonicPassCheckComponent,
    EmptyImportedDocumentComponent,
    DIDButtonComponent
  ],
})
export class ComponentsModule { }
