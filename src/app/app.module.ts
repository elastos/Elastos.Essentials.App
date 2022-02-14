import { CUSTOM_ELEMENTS_SCHEMA, ErrorHandler, Injectable, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouteReuseStrategy } from '@angular/router';
import { AppVersion } from '@awesome-cordova-plugins/app-version/ngx';
import { FirebaseX } from "@awesome-cordova-plugins/firebase-x/ngx";
import { Keyboard } from '@awesome-cordova-plugins/keyboard/ngx';
import { ScreenOrientation } from '@awesome-cordova-plugins/screen-orientation/ngx';
import { SplashScreen } from '@awesome-cordova-plugins/splash-screen/ngx';
import { StatusBar } from '@awesome-cordova-plugins/status-bar/ngx';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { iosTransitionAnimation } from '@ionic/core/dist/collection/utils/transition/ios.transition';
import { IonicStorageModule } from '@ionic/storage';
import { MissingTranslationHandler, MissingTranslationHandlerParams, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import * as Sentry from '@sentry/browser';
import { Integrations } from '@sentry/tracing';
import { Observable } from 'rxjs';
import { TranslationsLoader } from 'src/translationsloader';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SharedComponentsModule } from './components/sharedcomponents.module';
import { ContactsInitModule } from './contacts/init.module';
import { DeveloperToolsInitModule } from './developertools/init.module';
import { DIDSessionsInitModule } from './didsessions/init.module';
import { HiveManagerInitModule } from './hivemanager/init.module';
import { IdentityInitModule } from './identity/init.module';
import { LauncherModule } from './launcher/module';
import { Logger } from './logger';
import { ScannerInitModule } from './scanner/init.module';
import { GlobalNativeService } from './services/global.native.service';
import { SettingsInitModule } from './settings/init.module';
import { CRCouncilManagerInitModule } from './voting/crcouncilmanager/init.module';
import { CRCouncilVotingInitModule } from './voting/crcouncilvoting/init.module';
import { CRProposalVotingInitModule } from './voting/crproposalvoting/init.module';
import { DPoSRegistrationInitModule } from './voting/dposregistration/init.module';
import { DPoSVotingInitModule } from './voting/dposvoting/init.module';
import { WalletInitModule } from './wallet/init.module';





Sentry.init({
  dsn: "https://1de99f1d75654d479051bfdce1537821@o339076.ingest.sentry.io/5722236",
  release: "default",
  integrations: [
    new Integrations.BrowserTracing(),
  ],
  tracesSampleRate: 1.0,
});

@Injectable()
export class SentryErrorHandler implements ErrorHandler {
  private version = ''
  constructor(
    public native: GlobalNativeService,
    private appVersion: AppVersion,
  ) {
    this.appVersion.getVersionNumber().then(res => {
      this.version = res;
    }).catch(error => {
      Logger.error('Sentry', 'getVersionNumber error:', error);
    });
  }

  /**
   * Let a few special errors be handled silently.
   */
  private shouldHandleAsSilentError(error) {
    let stringifiedError = ""+error;

    // Error unhandled by the wallet connect 1.0 library, but this is not a real error (caused by calling
    // disconnect when not connected). This can be removed after upgrading to wallet connect 2.0.
    if (stringifiedError.indexOf("Missing or invalid topic field") >= 0)
      return true;

    return false;
  }

  handleError(error) {
    if (this.shouldHandleAsSilentError(error)) {
      Logger.warn("Sentry", "Globally catched exception (silently):", error);
      return;
    }

    Logger.error("Sentry", "Globally catched exception:", error);
    Logger.log("Sentry", document.URL);
    Logger.log("Sentry", 'version:', this.version);

    // Only send reports to sentry if we are not debugging.
    if (document.URL.includes('localhost')) { // Prod builds or --nodebug CLI builds use the app package id instead of a local IP
      /*const eventId = */ Sentry.captureException(error.originalError || error);
      // Sentry.showReportDialog({ eventId });
    }

    if (error.promise && error.promise.__zone_symbol__value && 'skipsentry' === error.promise.__zone_symbol__value.type) {
      // Do not popop error dialog, but still send to sentry for debug.
      Logger.error("Sentry", 'This exception has been handled:', error);
    } else {
      this.native.genericToast('common.sentry-message', 5000);
    }
  }
}


/**
 * NOTE: BPI 20210226: Tried to have one translation loader per dapp module, using forChild / isolate,
 * but this doesn't work. Only forRoot() seems to load stuff, and only one forRoot() works, etc.
 * So for now, we load and merge all translations here.
 */
class CustomTranslateLoader implements TranslateLoader {
  public getTranslation(lang: string): Observable<any> {
    return new Observable<any>(observer => {
        void TranslationsLoader.getTranslations(lang).then((translations) => {
            observer.next(translations);
            observer.complete();
        })
    });
  }
}

export class CustomMissingTranslationHandler implements MissingTranslationHandler {
  handle(params: MissingTranslationHandlerParams) {
    //Logger.warn("Translations", "Missing translation:", params)
  }
}

export function TranslateLoaderFactory() {
  return new CustomTranslateLoader();
}

// TMP BPI TEST - 2021.04.15 : Keep this code for now, we could use it in the future
/*export class CustomRouteReuseStrategy implements RouteReuseStrategy {
  private storedRoutes = new Map<string, DetachedRouteHandle>();

  // Determines if this route (and its subtree) should be detached to be reused later
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    Logger.warn("ROUTINGDEBUG", "shouldDetach", route);
    let shouldDetach = true; //route.routeConfig.path === 'list';
    Logger.warn("ROUTINGDEBUG", "shouldDetach?", shouldDetach);
    return shouldDetach;
  }

  // Stores the detached route.
  // Storing a null value should erase the previously stored value.
  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    Logger.warn("ROUTINGDEBUG", "store", route, handle);
    this.storedRoutes.set(route.routeConfig.path, handle);
  }

  // Determines if this route (and its subtree) should be reattached
  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    Logger.warn("ROUTINGDEBUG", "shouldAttach", route);
    let shouldAttach = !!route.routeConfig && !!this.storedRoutes.get(route.routeConfig.path);
    //let shouldAttach = true;
    Logger.warn("ROUTINGDEBUG", "shouldAttach?", shouldAttach);
    return shouldAttach;
  }

  // Retrieves the previously stored route
  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle {
    Logger.warn("ROUTINGDEBUG", "retrieve", route);
    let retrieved:DetachedRouteHandle = null;
    if (route.routeConfig)
      retrieved = this.storedRoutes.get(route.routeConfig.path) || null;
    Logger.warn("ROUTINGDEBUG", "retrieveD", retrieved);
    return retrieved;
  }

  // Determines if a route should be reused
  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    Logger.warn("ROUTINGDEBUG", "shouldReuseRoute", future, curr);
    let shouldReuse = false;
    //if (future.routeConfig)
     // shouldReuse = !!this.storedRoutes.get(future.routeConfig.path); //future.routeConfig === curr.routeConfig;
    Logger.warn("ROUTINGDEBUG", "shouldReuse?", shouldReuse);
    return shouldReuse;
  }
}*/

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
    CRCouncilManagerInitModule,
    CRProposalVotingInitModule,
    SettingsInitModule,
    DPoSVotingInitModule,
    DPoSRegistrationInitModule,
    DeveloperToolsInitModule,

    /*
     * Generic modules
     */
    BrowserModule,
    BrowserAnimationsModule,
    //HttpClientModule,
    SharedComponentsModule,
    IonicModule.forRoot({
      mode: 'ios',
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
      driverOrder: ['sqlite', 'indexeddb', 'localstorage', 'websql']
    }),
    BrowserAnimationsModule,
  ],
  providers: [
    AppVersion,
    Keyboard,
    ScreenOrientation,
    SplashScreen,
    StatusBar,
    FirebaseX,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
   // { provide: RouteReuseStrategy, useClass: CustomRouteReuseStrategy },
    { provide: ErrorHandler, useClass: SentryErrorHandler },
    //{ provide: TranslateModule, deps: [TranslationsLoader.loadAllModulesAndMerge("")]}
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
