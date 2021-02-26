import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { IonicModule, Platform } from '@ionic/angular';
import { SettingsRoutingModule } from './routing';
import { IonicStorageModule } from '@ionic/storage';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { MenuPageModule } from './pages/menu/menu.module';
import { LanguagePageModule } from './pages/language/language.module';
import { AboutPageModule } from './pages/about/about.module';
import { DeveloperPageModule } from './pages/developer/developer.module';
import { SelectNetPageModule } from './pages/select-net/select-net.module';
import { WarningComponent } from '../didsessions/components/warning/warning.component';

@NgModule({
  declarations: [
    WarningComponent
  ],
  imports: [
    CommonModule,
    BrowserModule,
    HttpClientModule,
    FormsModule,
    SettingsRoutingModule,
    MenuPageModule,
    LanguagePageModule,
    AboutPageModule,
    DeveloperPageModule,
    SelectNetPageModule,
    IonicModule.forRoot(),
    IonicStorageModule.forRoot(),
  ],
  bootstrap: [],
  entryComponents: [
    WarningComponent
  ],
  providers: [
    Platform
  ]
})
export class SettingsModule {}
