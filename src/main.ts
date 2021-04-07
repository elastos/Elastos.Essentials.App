import { ApplicationRef, enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import 'hammerjs';
import { TranslationsLoader } from './translationsloader';
import { Logger } from './app/logger';
import { defineCustomElements } from '@teamhive/lottie-player/loader';
import { connectivity } from '@elastosfoundation/elastos-connectivity-sdk-cordova';
import { InternalElastosConnector } from './app/model/internalelastosconnector';
import { enableDebugTools } from '@angular/platform-browser';
import { ElastosSDKHelper } from './app/helpers/elastossdk.helper';

// Replace default console logs with our own logger
Logger.init(console);

// Setup Lottie animation player
defineCustomElements(window);

// Enable production mode
if (environment.production) {
  enableProdMode();
}

// Load translations
TranslationsLoader.loadAllModulesAndMerge().then(()=>{
  Logger.log("global", "Bootstrapping the App Module");
  platformBrowserDynamic().bootstrapModule(AppModule).then((module)=>{
    let applicationRef = module.injector.get(ApplicationRef);
    let appComponent = applicationRef.components[0];
    enableDebugTools(appComponent);
  }).catch(err => console.log(err));
});
