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
  selector: 'app-prepare-did-advanced-mode',
  templateUrl: './advanced-mode.component.html',
  styleUrls: ['./advanced-mode.component.scss']
})
export class AdvancedModeComponent implements OnChanges, AfterViewInit {
  @ViewChild(IonSlides, { static: false }) private slide: IonSlides;

  @Input() hidden = true;
  @Input() slideIndex = 0;
  @Input() slideOpts = {
    initialSlide: 0,
    speed: 400,
    init: false,
    allowTouchMove: false,
    slidesPerView: 1
  };

  @Input() publishError: string = null;
  @Input() signInError: string = null;
  @Input() hiveError: string = null;
  @Input() finalizingPreparation = false;

  @Output() slideIndexChange = new EventEmitter<number>();
  @Output() cancelPreparation = new EventEmitter<void>();
  @Output() finalizePreparation = new EventEmitter<void>();

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

    // Update slide position when slideIndex changes
    if (changes.slideIndex && !changes.slideIndex.firstChange && this.slide) {
      void this.slide.slideTo(this.slideIndex);
    }
  }

  async getActiveSlide() {
    this.slideIndex = await this.slide.getActiveIndex();
    this.slideIndexChange.emit(this.slideIndex);
  }

  onCancelPreparation() {
    this.cancelPreparation.emit();
  }

  onFinalizePreparation() {
    this.finalizePreparation.emit();
  }
}
