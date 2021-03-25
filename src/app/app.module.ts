import { ErrorHandler, Injectable, NgModule } from '@angular/core';
import { RouteReuseStrategy } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MissingTranslationHandler, MissingTranslationHandlerParams, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { IonicStorageModule } from '@ionic/storage';
import { iosTransitionAnimation } from '@ionic/core/dist/collection/utils/transition/ios.transition';

import { AppComponent } from './app.component';
import { LauncherModule } from './launcher/module';
import { AppRoutingModule } from './app-routing.module';
import { SharedComponentsModule } from './components/sharedcomponents.module';
import { BrowserModule } from '@angular/platform-browser';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslationsLoader } from 'src/translationsloader';
import { Logger } from './logger';
import { WalletInitModule } from './wallet/init.module';
import { HiveManagerInitModule } from './hivemanager/init.module';
import { IdentityInitModule } from './identity/init.module';
import { ContactsInitModule } from './contacts/init.module';
import { DIDSessionsInitModule } from './didsessions/init.module';
import { ScannerInitModule } from './scanner/init.module';
import { CRCouncilVotingInitModule } from './crcouncilvoting/init.module';
import { CRProposalVotingInitModule } from './crproposalvoting/init.module';
import { SettingsInitModule } from './settings/init.module';
import { DPoSVotingInitModule } from './dposvoting/init.module';
import { DeveloperToolsInitModule } from './developertools/init.module';

@Injectable()
export class SentryErrorHandler implements ErrorHandler {
  constructor(
    // TODO public native: NativeService,
  ) {
  }

  handleError(error) {
    Logger.error("Sentry", "Globally catched exception:", error);
    Logger.error("Sentry", document.URL);

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
    Logger.warn("Translations", "Missing translation:", params)
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
    LauncherModule,

    /*
     * Sub-apps INIT (only - for bundle size / perf) modules
     */
    WalletInitModule,
    HiveManagerInitModule,
    IdentityInitModule,
    ContactsInitModule,
    DIDSessionsInitModule,
    ScannerInitModule,
    CRCouncilVotingInitModule,
    CRProposalVotingInitModule,
    SettingsInitModule,
    DPoSVotingInitModule,
    DeveloperToolsInitModule,

    /*
     * Generic modules
     */
    BrowserModule,
    BrowserAnimationsModule,
    //HttpClientModule,
    SharedComponentsModule,
    IonicModule.forRoot({
      mode: 'md',
      scrollAssist: false,
      scrollPadding: false,
      navAnimation: iosTransitionAnimation
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
    IonicStorageModule.forRoot({
      name: '__essentials.db',
      driverOrder: ['sqlite', 'indexeddb', 'websql', 'localstorage']
    }),
    BrowserAnimationsModule,
  ],
  providers: [
    ScreenOrientation,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: ErrorHandler, useClass: SentryErrorHandler },
    //{ provide: TranslateModule, deps: [TranslationsLoader.loadAllModulesAndMerge("")]}
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
