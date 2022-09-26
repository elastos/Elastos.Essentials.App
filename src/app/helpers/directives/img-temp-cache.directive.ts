import { AfterViewInit, Directive, ElementRef, Input } from '@angular/core';
import { HTTP } from '@awesome-cordova-plugins/http/ngx';
import { Logger } from 'src/app/logger';
import { transparentPixelIconDataUrl } from '../picture.helpers';

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


// List of pictures already fetched remotely during this session. Pictures are fetched only once
// per session to save bandwidth.
let fetchedSessionUrls: {
  [url: string]: boolean;
} = {};
@Directive({
  selector: '[cache]'
})
export class ImageCacheDirective implements AfterViewInit {
  private _cache: string;
  @Input('cache') set cache(value: string) {
    this._cache = value;
    this.updatePicture();
  }

  constructor(public el: ElementRef, private http: HTTP) { }

  ngAfterViewInit() {
  }

  private updatePicture() {
    //console.log('Trying to get image from cache: ', this._cache);
    this.el.nativeElement.crossOrigin = null; // CORS enabling
    let cache = localStorage.getItem(this._cache);

    if (cache) {
      //console.log('Already cached! Using cache...');
      this.el.nativeElement.src = cache;
    }
    else {
      // Erase the previous picture in case the same picture is used by multiple entries, while we fetch and no cache.
      this.el.nativeElement.src = transparentPixelIconDataUrl();
    }

    if (!this._cache.startsWith("data")) { // Don't fetch data urls, use directly
      if (!fetchedSessionUrls[this._cache]) { // Fetch only once per session
        // Fetch the picture, no matter if it was in cache or not
        //console.log('Fetching picture ' + this._cache, fetchedSessionUrls);
        this.fetchImage();
      }
    }
    else {
      this.el.nativeElement.src = this._cache;
    }
  }

  fetchImage() {
    let url = this._cache;
    const reqOptions = {
      method: 'get',
      responseType: 'blob',
      headers: {
      }
    };
    this.http.sendRequest(url, <any>reqOptions).then(response => {
      let reader = new FileReader();
      reader.onloadend = () => {
        //console.log('Got data for cache: ', this._cache, reader.result);

        // If the picture cache url changes during a fetch, just forget the fetch result.
        // Otherwise, this would overwrite the picture with a wrong content.
        if (this._cache !== url) {
          Logger.warn("directives", "Image cache url ahs changed while receiving the previous content. Skipping content.");
          return;
        }

        localStorage.setItem(this._cache, reader.result.toString());
        this.el.nativeElement.src = reader.result;

        fetchedSessionUrls[url] = true;
      }
      reader.readAsDataURL(response.data);
    }).catch(e => {
      Logger.warn("directives", "Failed to fetch picture for cache", url, e);
    });
  }
}