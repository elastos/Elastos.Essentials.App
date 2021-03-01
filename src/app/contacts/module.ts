import { NgModule, ErrorHandler, CUSTOM_ELEMENTS_SCHEMA, Injectable } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { QRCodeModule } from 'angularx-qrcode';
import { IonicModule } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ContactsRoutingModule } from './routing';
import { OptionsComponent } from './components/options/options.component';
import { DeleteComponent } from './components/delete/delete.component';
import { QRCodeComponent } from './components/qrcode/qrcode.component';
import { PictureComponent } from './components/picture/picture.component';
import { ComponentsModule } from './components/components.module';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { AddPage } from './pages/add/add.page';
import { ConfirmPage } from './pages/confirm/confirm.page';
import { CustomizePage } from './pages/customize/customize.page';
import { FriendDetailsPage } from './pages/friend-details/friend-details.page';
import { FriendsPage } from './pages/friends/friends.page';
import { InvitePage } from './pages/invite/invite.page';

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
    IonicModule.forRoot(),
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
export class ContactsModule {}
