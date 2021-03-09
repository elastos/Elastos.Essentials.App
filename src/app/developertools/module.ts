import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { IonicStorageModule } from '@ionic/storage';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy, Platform } from '@ionic/angular';
import { DeveloperToolsRoutingModule } from './routing';
import { FormsModule } from '@angular/forms';
import { Clipboard } from '@ionic-native/clipboard/ngx';

import { HomePage } from './pages/home/home';

import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { CreateAppPage } from './pages/createapp/createapp';
import { AppDetailsPage } from './pages/appdetails/appdetails';
import { HttpClientModule } from '@angular/common/http';
import { HelpComponent } from './components/help/help.component';
import { DeleteComponent } from './components/delete/delete.component';
import { HiveService } from './services/hive.service';
import { IdentityService } from './services/identity.service';
import { DAppService } from './services/dapp.service';
import { SharedComponentsModule } from '../components/sharedcomponents.module';

@NgModule({
  declarations: [
    HomePage,
    CreateAppPage,
    AppDetailsPage,
    HelpComponent,
    DeleteComponent,
  ],
  imports: [
    CommonModule,
    SharedComponentsModule,
    DeveloperToolsRoutingModule,
    HttpClientModule,
    FormsModule,
    IonicStorageModule,
    IonicModule
  ],
  bootstrap: [],
  entryComponents: [
    HomePage,
    CreateAppPage,
    AppDetailsPage,
    HelpComponent,
    DeleteComponent
  ],
  providers: [
    SplashScreen,
    Platform,
    Clipboard
  ]
})
export class DeveloperToolsModule {}
