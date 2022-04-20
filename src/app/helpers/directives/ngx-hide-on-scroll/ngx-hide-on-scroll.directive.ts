import { isPlatformServer } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, EventEmitter, Inject, Input, OnDestroy, Output, PLATFORM_ID } from '@angular/core';
import { ScrollCustomEvent } from '@ionic/angular';
import { fromEvent, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  filter, map, pairwise, share, takeUntil, throttleTime
} from 'rxjs/operators';
import { NgxHideOnScrollService } from './ngx-hide-on-scroll.service';

// Inspired by: https://netbasal.com/reactive-sticky-header-in-angular-12dbffb3f1d3

/**
 * The `ngxHideOnScroll` directive allows you to hide an html element (e.g. navbar) on scroll down and show it again on scroll up.
 */
@Directive({
  selector: '[ngxHideOnScroll]',
  exportAs: 'ngxHideOnScroll'
})
export class NgxHideOnScrollDirective implements AfterViewInit, OnDestroy {
  /**
   * `'Down'`: The element will be hidden on scroll down and it will be shown again on scroll up.<br/>`Up`: The element will be hidden on scroll up and it will be shown again on scroll down.
   */
  @Input() hideOnScroll: 'Down' | 'Up' = 'Down';

  /**
   * The CSS property used to hide/show the element.
   */
  @Input() propertyUsedToHide: 'top' | 'bottom' | 'height' | 'transform' = 'transform';

  /**
   * The value of `propertyUsedToHide` when the element is hidden.
   */
  @Input() valueWhenHidden = 'translateY(100%)';

  /**
   * The value of `propertyUsedToHide` when the element is shown.
   */
  @Input() valueWhenShown = 'translateY(0)';

  /**
   * The selector of the element you want to listen the scroll event, in case it is not the default browser scrolling element (`document.scrollingElement` or `document.documentElement`). For example [` .mat-sidenav-content`]( https://stackoverflow.com/a/52931772/12954396) if you are using [Angular Material Sidenav]( https://material.angular.io/components/sidenav)
   */
  @Input() scrollingElementSelector = '';

  @Output() hideOnScrollChanged = new EventEmitter<IHideOnScrollChangedEvent>();

  private unsubscribeNotifier = new Subject<void>();
  private destroyedNotifier = new Subject<void>();

  constructor(
    private s: NgxHideOnScrollService,
    private elementRef: ElementRef<HTMLElement>,
    @Inject(PLATFORM_ID) private platformId: string
  ) { }

  ngAfterViewInit() {
    this.init();

    this.s.scrollingElementsDetected$
      .pipe(takeUntil(this.destroyedNotifier))
      .subscribe(() => this.init());
  }

  ngOnDestroy() {
    this.reset(true);
  }

  init() {
    if (isPlatformServer(this.platformId)) {
      return;
    }

    this.reset();

    let elementToListenScrollEvent;
    let scrollingElement: HTMLElement;
    if (!this.scrollingElementSelector) {
      elementToListenScrollEvent = window;
      scrollingElement = this.getDefaultScrollingElement();
    } else {
      scrollingElement = document.querySelector(this.scrollingElementSelector) as HTMLElement;
      if (!scrollingElement) {
        console.warn(`NgxHideOnScroll: @Input() scrollingElementSelector\nElement with selector: "${this.scrollingElementSelector}" not found.`);
        return;
      }
      elementToListenScrollEvent = scrollingElement;
    }

    /* elementToListenScrollEvent.addEventListener("scroll", e => {
      console.log("MANUAL ON SCROLL", e)
    }) */

    /*  elementToListenScrollEvent.addEventListener("ionScroll", e => {
       console.log("MANUAL ON ION-SCROLL", e)
     })
  */
    const scroll$ = fromEvent<ScrollCustomEvent>(elementToListenScrollEvent, 'ionScroll').pipe(
      takeUntil(this.unsubscribeNotifier),
      throttleTime(50), // only emit every 50 ms
      map(event => event.detail.scrollTop), // get vertical scroll position
      pairwise(),  // look at this and the last emitted element
      // compare this and the last element to figure out scrolling direction
      map(([y1, y2]): ScrollDirection => (y2 < y1 ? ScrollDirection.Up : ScrollDirection.Down)),
      distinctUntilChanged(), // only emit when scrolling direction changed
      share(), // share a single subscription to the underlying sequence in case of multiple subscribers
    );

    const scrollUp$ = scroll$.pipe(
      filter(direction => direction === ScrollDirection.Up)
    );

    const scrollDown$ = scroll$.pipe(
      filter(direction => direction === ScrollDirection.Down)
    );

    let scrollUpAction: () => void;
    let scrollDownAction: () => void;
    if (this.hideOnScroll === 'Up') {
      scrollUpAction = () => this.hideElement(scrollingElement);
      scrollDownAction = () => this.showElement(scrollingElement);
    } else {
      scrollUpAction = () => this.showElement(scrollingElement);
      scrollDownAction = () => this.hideElement(scrollingElement);
    }

    scrollUp$.subscribe(() => {
      scrollUpAction()
    });
    scrollDown$.subscribe(() => {
      scrollDownAction()
    });
  }

  private reset(destroyed?: boolean) {
    this.unsubscribeNotifier.next();
    this.unsubscribeNotifier.complete();
    if (destroyed) {
      this.destroyedNotifier.next();
      this.destroyedNotifier.complete();
    }
  }

  private _isHidden = false;
  get isHidden() {
    return this._isHidden;
  }

  hideElement(scrollingElem?: HTMLElement) {
    this.elementRef.nativeElement.style[this.propertyUsedToHide] = this.valueWhenHidden;
    this._isHidden = true;
    this.emitChange();
  }

  showElement(scrollingElem?: HTMLElement) {
    this.elementRef.nativeElement.style[this.propertyUsedToHide] = this.valueWhenShown;
    this._isHidden = false;
    this.emitChange();
  }

  private getDefaultScrollingElement() {
    return (document.scrollingElement || document.documentElement) as HTMLElement;
  }

  private emitChange(scrollingElem?: HTMLElement) {
    const hideElem = this.elementRef.nativeElement;
    const hidden = this.isHidden;
    this.hideOnScrollChanged.emit({ hidden, hideElem, scrollingElem });
  }
}

enum ScrollDirection {
  Up = 'Up',
  Down = 'Down'
}

export interface IHideOnScrollChangedEvent {
  hidden: boolean;
  hideElem: HTMLElement;
  scrollingElem?: HTMLElement;
}
