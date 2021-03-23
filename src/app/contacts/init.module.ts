import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { Clipboard } from '@ionic-native/clipboard/ngx';

@NgModule({
  declarations: [
  ],
  imports: [
    HttpClientModule,
    IonicModule,
    IonicStorageModule.forRoot(),
    TranslateModule
 ],
  bootstrap: [],
  entryComponents: [
  ],
  providers: [
    Clipboard,
  ],
  schemas: []
})
export class ContactsInitModule {}
