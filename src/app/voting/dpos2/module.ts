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
import { NodeDetailPage } from './pages/node-detail/node-detail.page';
import { DPoS2RegistrationPage } from './pages/registration/registration.page';
import { VotePage } from './pages/vote/vote.page';
import { DPoS2RoutingModule } from './routing';

@NgModule({
  declarations: [
    DPoS2RegistrationPage,
    NodeDetailPage,
    VotePage,
  ],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    HttpClientModule,
    DPoS2RoutingModule,
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
export class DPoS2Module { }
