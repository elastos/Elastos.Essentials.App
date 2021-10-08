import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { BrowserTitleBarComponent } from './components/titlebar/titlebar.component';
import { BrowserPage } from './pages/browser/browser';
import { EditFavoritePage } from './pages/edit-favorite/edit-favorite';
import { HomePage } from './pages/home/home';
import { MenuPage } from './pages/menu/menu';
import { DAppBrowserRoutingModule } from './routing';

@NgModule({
  declarations: [
    HomePage,
    BrowserPage,
    MenuPage,
    EditFavoritePage,
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
export class DAppBrowserModule { }
