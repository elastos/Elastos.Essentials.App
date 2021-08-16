import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicStorageModule } from '@ionic/storage';
import { IonicModule, Platform } from '@ionic/angular';
import { DAppBrowserRoutingModule } from './routing';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { TranslateModule } from '@ngx-translate/core';
import { HomePage } from './pages/home/home';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { BrowserTitleBarComponent } from './components/titlebar/titlebar.component';

@NgModule({
  declarations: [
    HomePage,
    BrowserTitleBarComponent
  ],
  imports: [
    CommonModule,
    SharedComponentsModule,
    DAppBrowserRoutingModule,
    HttpClientModule,
    FormsModule,
    IonicStorageModule,
    IonicModule,
    TranslateModule
  ],
  bootstrap: [],
  entryComponents: [
    HomePage
  ],
  providers: [
    Platform,
    InAppBrowser
  ]
})
export class DAppBrowserModule {}
