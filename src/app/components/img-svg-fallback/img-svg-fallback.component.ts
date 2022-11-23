import { Component, Input, OnInit } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

/**
 * This component loads any picture, including a remote PNG or SVG, into an img tag.
 * But before loading, and in case there is a load error an inline SVG (that supports currentColor
 * to be applied) is displayed.
 */
@Component({
  selector: 'img-svg-fallback',
  templateUrl: './img-svg-fallback.component.html',
  styleUrls: ['./img-svg-fallback.component.scss'],
})
export class ImgSVGFallbackComponent implements OnInit {
  @Input("src")
  public srcPath: string = null;

  @Input("default")
  public defaultPath: string = null;

  public initialLoadCompleted = false;
  public loadFailed = false;

  constructor(
    public theme: GlobalThemeService
  ) { }

  ngOnInit() {

  }

  onLoad() {
    this.initialLoadCompleted = true;
    this.loadFailed = false;
  }

  onError() {
    this.initialLoadCompleted = true;
    this.loadFailed = true;
  }
}
