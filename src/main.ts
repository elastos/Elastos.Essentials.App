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

// Replace default console logs with our own logger
Logger.init(console);

// Use our own internal connector for the connectivity SDK
let internalConnector = new InternalElastosConnector();
connectivity.unregisterConnector("local-identity");
connectivity.registerConnector(new InternalElastosConnector());
connectivity.setActiveConnector(internalConnector.name);

// Register Essentials' App DID to the connectivity SDK - For hive authentication flows.
connectivity.setApplicationDID("did:elastos:ig1nqyyJhwTctdLyDFbZomSbZSjyMN1uor");

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
