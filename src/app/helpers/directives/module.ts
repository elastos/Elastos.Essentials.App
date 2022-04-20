import { NgModule } from '@angular/core';
import { ImgFallbackDirective } from './img-fallback.directive';
import { NgxHideOnScrollModule } from './ngx-hide-on-scroll/ngx-hide-on-scroll.module';

@NgModule({
  declarations: [
    ImgFallbackDirective
  ],
  imports: [
    NgxHideOnScrollModule
  ],
  bootstrap: [],
  exports: [
    ImgFallbackDirective,
    NgxHideOnScrollModule
  ],
  entryComponents: [
  ],
  providers: []
})
export class GlobalDirectivesModule { }
