import { AfterContentInit, Directive, OnDestroy } from '@angular/core';
import { NgxHideOnScrollService } from './ngx-hide-on-scroll.service';

/**
 * Use this on scrollable elements to notify [ngxHideOnScroll] on render updates (e.g *ngIfs)
 */
@Directive({ selector: '[ngxDetectHideOnScroll]' })
export class NgxDetectHideOnScrollDirective implements AfterContentInit, OnDestroy {
  constructor(private s: NgxHideOnScrollService) {}

  ngAfterContentInit() {
    // wait a tick to let initted element render
    setTimeout(() => this.s.scrollingElementsDetected$.next());
  }
  ngOnDestroy() {
    this.s.scrollingElementsDetected$.next();
  }
}
