import { NgModule } from '@angular/core';
import { ImgFallbackDirective } from './img-fallback.directive';
import { ImageCacheDirective } from './img-temp-cache.directive';
import { NgxHideOnScrollModule } from './ngx-hide-on-scroll/ngx-hide-on-scroll.module';

@NgModule({
  declarations: [
    ImgFallbackDirective,
    ImageCacheDirective
  ],
  imports: [
    NgxHideOnScrollModule
  ],
  bootstrap: [],
  exports: [
    ImgFallbackDirective,
    ImageCacheDirective,
    NgxHideOnScrollModule
  ],
  entryComponents: [
  ],
  providers: []
})
export class GlobalDirectivesModule { }
