import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { IonSlides } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

@Component({
  selector: 'app-lightweight-mode',
  templateUrl: './lightweight-mode.component.html',
  styleUrls: ['./lightweight-mode.component.scss']
})
export class LightweightModeComponent implements OnChanges, AfterViewInit {
  @ViewChild(IonSlides, { static: false }) private slide: IonSlides;

  @Input() hidden = true;
  @Input() slideIndex = 0;
  @Input() slideOpts = {
    initialSlide: 0,
    speed: 400,
    init: false
  };

  @Output() slideIndexChange = new EventEmitter<number>();
  @Output() nextSlide = new EventEmitter<void>();
  @Output() createWallet = new EventEmitter<void>();
  @Output() importWallet = new EventEmitter<void>();

  constructor(public theme: GlobalThemeService) {}

  ngAfterViewInit() {
    // Initialize slides when component is ready
    if (!this.hidden && this.slide) {
      void this.slide.getSwiper().then(swiper => {
        swiper.init();
        // Reset to first slide
        swiper.slideTo(0, 0);
        this.slideIndex = 0;
        this.slideIndexChange.emit(this.slideIndex);
      });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Only reset slides when hidden changes from true to false (screen re-enters)
    if (changes.hidden && !changes.hidden.firstChange && !this.hidden && this.slide) {
      setTimeout(() => {
        void this.slide.getSwiper().then(swiper => {
          swiper.init();
          // Reset to first slide
          swiper.slideTo(0, 0);
          this.slideIndex = 0;
          this.slideIndexChange.emit(this.slideIndex);
        });
      }, 100);
    }
  }

  async getActiveSlide() {
    this.slideIndex = await this.slide.getActiveIndex();
    this.slideIndexChange.emit(this.slideIndex);
  }

  onNextSlide() {
    void this.slide.slideNext();
    this.nextSlide.emit();
  }

  onCreateWallet() {
    this.createWallet.emit();
  }

  onImportWallet() {
    this.importWallet.emit();
  }
}
