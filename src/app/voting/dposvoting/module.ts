import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebView } from '@awesome-cordova-plugins/ionic-webview/ngx';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { GlobalDirectivesModule } from 'src/app/helpers/directives/module';
import { DPoSVotingRoutingModule } from './routing';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    HttpClientModule,
    DPoSVotingRoutingModule,
    IonicModule,
    IonicStorageModule,
    SharedComponentsModule,
    GlobalDirectivesModule
  ],
  bootstrap: [],
  entryComponents: [
  ],
  providers: [
    Platform,
    WebView
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DPoSVotingModule { }
