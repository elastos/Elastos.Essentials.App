import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import 'hammerjs';
import { TranslationsLoader } from './translationsloader';

if (environment.production) {
  enableProdMode();
}

TranslationsLoader.loadAllModulesAndMerge().then(()=>{
  platformBrowserDynamic().bootstrapModule(AppModule).catch(err => console.log(err));
});
