import { APP_INITIALIZER, ErrorHandler, Injectable, NgModule } from '@angular/core';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MissingTranslationHandler, MissingTranslationHandlerParams, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { IonicStorageModule } from '@ionic/storage';

import { DragulaModule } from 'ng2-dragula';
import { AngularFittextModule } from 'angular-fittext';
import { AppComponent } from './app.component';
import { LauncherModule } from './launcher/module';
import { AppRoutingModule } from './app-routing.module';
import { SharedComponentsModule } from './components/sharedcomponents.module';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { DIDSessionsModule } from './didsessions/module';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ScannerModule } from './scanner/module';
import { HiveManagerModule } from './hivemanager/module';
import { SettingsModule } from './settings/module';
import { TranslationsLoader } from 'src/translationsloader';
import { ContactsModule } from './contacts/module';
import { IdentityModule } from './identity/module';

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

/**
 * NOTE: BPI 20210226: Tried to have one translation loader per dapp module, using forChild / isolate,
 * but this doesn't work. Only forRoot() seems to load stuff, and only one forRoot() works, etc.
 * So for now, we load and merge all translations here.
 */
class CustomTranslateLoader implements TranslateLoader {
  public getTranslation(lang: string): Observable<any> {
    return Observable.create(observer => {
      observer.next(TranslationsLoader.getTranslations(lang));
      observer.complete();
    });
  }
}

export class CustomMissingTranslationHandler implements MissingTranslationHandler {
  handle(params: MissingTranslationHandlerParams) {
    console.warn("MISSING TRANSLATION:", params)
  }
}

export function TranslateLoaderFactory() {
  return new CustomTranslateLoader();
}

@NgModule({
  declarations: [
    AppComponent,
  ],
  entryComponents: [
    AppComponent
  ],
  imports: [
    /*
     * Sub-apps modules
     */
    LauncherModule,
    DIDSessionsModule,
    ScannerModule,
    HiveManagerModule,
    SettingsModule,
    ContactsModule,
    IdentityModule,

    /*
     * Generic modules
     */
    BrowserModule,
    BrowserAnimationsModule,
    //HttpClientModule,
    //AngularFittextModule,
    SharedComponentsModule,
    IonicModule.forRoot({
      mode: 'md'
    }),
    AppRoutingModule,
    FormsModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (TranslateLoaderFactory)
      },
      missingTranslationHandler: {provide: MissingTranslationHandler, useClass: CustomMissingTranslationHandler},
    }),
    DragulaModule.forRoot(),
    IonicStorageModule.forRoot({
      name: '__essentials.db',
      driverOrder: ['localstorage', 'indexeddb', 'sqlite', 'websql']
    }),
    BrowserAnimationsModule,
  ],
  providers: [
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: ErrorHandler, useClass: SentryErrorHandler },
    //{ provide: TranslateModule, deps: [TranslationsLoader.loadAllModulesAndMerge("")]}
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
