import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import 'hammerjs';
import { TranslationsLoader } from './translationsloader';
import { Logger } from './app/logger';

// Replace default console logs with our own logger
Logger.init(console);

if (environment.production) {
  enableProdMode();
}

TranslationsLoader.loadAllModulesAndMerge().then(()=>{
  platformBrowserDynamic().bootstrapModule(AppModule).catch(err => console.log(err));
});
