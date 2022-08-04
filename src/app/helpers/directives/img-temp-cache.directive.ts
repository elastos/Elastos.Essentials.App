import { AfterViewInit, Directive, ElementRef, Input } from '@angular/core';

/**
 * Local storage cache for img tags.
 * Using the [cache] directive instead of [src], pictures are first retrieved
 * and shown from the local cache, then fetched remotely and cached again.
 *
 * Note that pictures are still fetched EVERY TIME to get fresh image version, but this cache
 * simply shows the previous version of the picture until the remote version is fully ready,
 * which can take a few seconds depending on the network.
 *
 * Inspired by https://github.com/cekrem/localStorage-imageCache/blob/master/image-cache.ts
 */
@Directive({
  selector: '[cache]'
})
export class ImageCacheDirective implements AfterViewInit {
  @Input() cache: string;

  constructor(public el: ElementRef) { }

  ngAfterViewInit() {
    console.log('Trying to cache image: ', this.cache);
    this.el.nativeElement.crossOrigin = null; // CORS enabling
    let cache = localStorage.getItem(this.cache);

    if (cache) {
      console.log('Already cached! Using cache...');
      this.el.nativeElement.src = cache;
    }

    // Fetch the picture, no matter if it was in cache or not
    console.log('Fetching picture ' + this.cache);
    this.cacheImage();
  }

  cacheImage(proxy = false) {
    let xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = () => {
      let reader = new FileReader();
      reader.onloadend = () => {
        localStorage.setItem(this.cache, reader.result.toString());
        this.el.nativeElement.src = reader.result;
      }
      reader.readAsDataURL(xhr.response);
    };

    xhr.onerror = (error) => {
      console.warn(error, 'error while fetching picture, trying with proxy...')
      if (!proxy) {
        this.cacheImage(true);
      }
      else {
        // Still can't fetch the picture. Do nothing. We keep using the previous
        // cache if any, or the picture will be broken. TODO: we could merge
        // this with the placeholder directive

        //console.error('Giving up cache, setting src to url!');
        //this.el.nativeElement.src = this.cache;
      }
    }

    let url = this.cache;
    if (proxy) {
      url = 'https://crossorigin.me/' + url;
    }

    xhr.open('GET', url);
    xhr.send();
  }
}