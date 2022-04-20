import { NgModule } from '@angular/core';
import { NgxDetectHideOnScrollDirective } from './ngx-detect-hide-on-scroll.directive';
import { NgxHideOnScrollDirective } from './ngx-hide-on-scroll.directive';

@NgModule({
  declarations: [NgxHideOnScrollDirective, NgxDetectHideOnScrollDirective],
  imports: [],
  exports: [NgxHideOnScrollDirective, NgxDetectHideOnScrollDirective]
})
export class NgxHideOnScrollModule { }
