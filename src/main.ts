import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import 'hammerjs';
import { TranslationsLoader } from './translationsloader';
import { Logger } from './app/logger';
import { defineCustomElements } from '@teamhive/lottie-player/loader';
import { connectivity } from '@elastosfoundation/elastos-connectivity-sdk-cordova';
import { InternalElastosConnector } from './app/model/internalelastosconnector';

// Replace default console logs with our own logger
Logger.init(console);

// Use our own internal connector for the connectivity SDK
let internalConnector = new InternalElastosConnector();
connectivity.unregisterConnector("local-identity");
connectivity.registerConnector(new InternalElastosConnector());
connectivity.setActiveConnector(internalConnector.name);

// Setup Lottie animation player
defineCustomElements(window);

// Enable production mode
if (environment.production) {
  enableProdMode();
}

// Load translations
TranslationsLoader.loadAllModulesAndMerge().then(()=>{
  platformBrowserDynamic().bootstrapModule(AppModule).catch(err => console.log(err));
});
