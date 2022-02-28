/* eslint-disable @typescript-eslint/ban-types */
import { Directive, ElementRef, EventEmitter, Input, OnDestroy, Output, Renderer2 } from '@angular/core';

/**
 * Loads a picture into an <img> tag, and replaces it with a given
 * placeholder picture in case of error.
 */
/**
 * Created by vadimdez on 28/01/2018.
 */
@Directive({
  selector: 'img[src-fallback]'
})
export class ImgFallbackDirective implements OnDestroy {
  @Input('src-fallback') imgSrc: string;
  @Output('loaded') loaded = new EventEmitter<boolean>();
  private nativeElement: HTMLElement;
  private isApplied = false;
  private ERROR_EVENT_TYPE = 'error';
  private LOAD_EVENT_TYPE = 'load';
  private cancelOnError: Function;
  private cancelOnLoad: Function;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.nativeElement = el.nativeElement;

    this.onError = this.onError.bind(this);
    this.onLoad = this.onLoad.bind(this);
    this.addEvents();
  }

  ngOnDestroy() {
    this.removeErrorEvent();
    this.removeOnLoadEvent();
  }

  private onError() {
    if (this.nativeElement.getAttribute('src') !== this.imgSrc) {
      this.isApplied = true;
      this.renderer.setAttribute(this.nativeElement, 'src', this.imgSrc);
    } else {
      this.removeOnLoadEvent();
    }
  }

  private onLoad() {
    this.loaded.emit(this.isApplied);
  }

  private removeErrorEvent() {
    if (this.cancelOnError) {
      this.cancelOnError();
    }
  }

  private removeOnLoadEvent() {
    if (this.cancelOnLoad) {
      this.cancelOnLoad();
    }
  }

  private addEvents() {
    this.cancelOnError = this.renderer.listen(this.nativeElement, this.ERROR_EVENT_TYPE, this.onError);
    this.cancelOnLoad = this.renderer.listen(this.nativeElement, this.LOAD_EVENT_TYPE, this.onLoad);
  }
}