import { NgModule, ErrorHandler, Injectable } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { IonicImageLoader } from 'ionic-image-loader';
import { WebView } from '@ionic-native/ionic-webview/ngx';

import { HttpClientModule } from '@angular/common/http';

import { DPoSVotingRoutingModule } from './routing';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { HistoryPage } from './pages/history/history.page';
import { HomePage } from './pages/home/home.page';
import { MenuPage } from './pages/menu/menu.page';
import { SearchPage } from './pages/search/search.page';
import { StatsPage } from './pages/stats/stats.page';
import { TxPage } from './pages/tx/tx.page';
import { VotePage } from './pages/vote/vote.page';
import { MenuPageModule } from './pages/menu/menu.module';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    DPoSVotingRoutingModule,
    IonicModule,
    IonicStorageModule,
    IonicImageLoader,
    SharedComponentsModule
  ],
  bootstrap: [],
  entryComponents: [
  ],
  providers: [
    Platform,
    WebView,
    MenuPageModule
  ]
})
export class DPoSVotingModule {}
