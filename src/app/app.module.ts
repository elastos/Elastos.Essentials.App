import { APP_INITIALIZER, ErrorHandler, Injectable, NgModule } from '@angular/core';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { IonicStorageModule } from '@ionic/storage';

import { DragulaModule } from 'ng2-dragula';
import { AngularFittextModule } from 'angular-fittext';
import { AppComponent } from './app.component';
import { LauncherModule } from './launcher/launcher.module';
import { AppRoutingModule } from './app-routing.module';
import { SharedComponentsModule } from './components/sharedcomponents.module';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { DIDSessionsModule } from './didsessions/didsessions.module';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Injectable()
export class SentryErrorHandler implements ErrorHandler {
  constructor(
    // TODO public native: NativeService,
  ) {
  }

  handleError(error) {
    console.error("Globally catched exception:", error);

    console.log(document.URL);
    // Only send reports to sentry if we are not debugging.
    if (document.URL.includes('launcher')) { // Prod builds or --nodebug CLI builds use the app package id instead of a local IP
      // TODO @zhiming Sentry.captureException(error.originalError || error);
      //Sentry.showReportDialog({ eventId });
    }

    /* TODO this.native.genericAlert(
      'Sorry, the application encountered an error. This has been reported to the team.',
      'Error'
    );*/
  }
}

@NgModule({
  declarations: [
    AppComponent,
  ],
  entryComponents: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    //HttpClientModule,
    //AngularFittextModule,
    LauncherModule,
    DIDSessionsModule,
    SharedComponentsModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    FormsModule,
    DragulaModule.forRoot(),
    IonicStorageModule.forRoot({
      name: '__launcher.db',
      driverOrder: ['localstorage', 'indexeddb', 'sqlite', 'websql']
    }),
    BrowserAnimationsModule,
  ],
  providers: [
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: ErrorHandler, useClass: SentryErrorHandler },
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
