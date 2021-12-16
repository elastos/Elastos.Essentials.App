import { ApplicationRef, enableProdMode } from '@angular/core';
import { enableDebugTools } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { defineCustomElements } from '@teamhive/lottie-player/loader';
import 'hammerjs';
import { AppModule } from './app/app.module';
import { Logger } from './app/logger';
import { environment } from './environments/environment';

// Replace default console logs with our own logger
Logger.init(console);

// Setup Lottie animation player
void defineCustomElements(window);

// Enable production mode
if (true && environment.production) {
  enableProdMode();
}

// Load translations
Logger.log("global", "Bootstrapping the App Module");
platformBrowserDynamic().bootstrapModule(AppModule).then((module) => {
  let applicationRef = module.injector.get(ApplicationRef);
  let appComponent = applicationRef.components[0];
  enableDebugTools(appComponent);
  Logger.log("global", "App module bootstrap complete");
}).catch(err => console.log(err));
