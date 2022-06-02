import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { IonicModule } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { QRCodeModule } from 'angularx-qrcode';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { ComponentsModule } from './components/components.module';
import { DeleteComponent } from './components/delete/delete.component';
import { OptionsComponent } from './components/options/options.component';
import { PictureComponent } from './components/picture/picture.component';
import { QRCodeComponent } from './components/qrcode/qrcode.component';
import { AddPage } from './pages/add/add.page';
import { ConfirmPage } from './pages/confirm/confirm.page';
import { CustomizePage } from './pages/customize/customize.page';
import { FriendDetailsPage } from './pages/friend-details/friend-details.page';
import { FriendsPage } from './pages/friends/friends.page';
import { InvitePage } from './pages/invite/invite.page';
import { ContactsRoutingModule } from './routing';

@NgModule({
  declarations: [
    OptionsComponent,
    DeleteComponent,
    QRCodeComponent,
    PictureComponent,
    AddPage,
    ConfirmPage,
    CustomizePage,
    FriendDetailsPage,
    FriendsPage,
    InvitePage,
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    IonicModule,
    ContactsRoutingModule,
    QRCodeModule,
    ComponentsModule,
    SharedComponentsModule,
    FormsModule,
    IonicStorageModule.forRoot(),
    TranslateModule
  ],
  bootstrap: [],
  entryComponents: [
    OptionsComponent,
    DeleteComponent,
    QRCodeComponent,
    PictureComponent,
  ],
  providers: [
    Clipboard,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ContactsModule { }
