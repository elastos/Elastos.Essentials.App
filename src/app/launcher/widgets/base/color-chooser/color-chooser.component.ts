import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { ActiveTheming, GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { ThemeConfig } from 'src/app/services/theming/theme';

type ColorChooserComponentOptions = {
  // Nothing yet
}

@Component({
  selector: 'app-color-chooser',
  templateUrl: './color-chooser.component.html',
  styleUrls: ['./color-chooser.component.scss'],
})
export class ColorChooserComponent implements OnInit {
  public options: ColorChooserComponentOptions = null;

  public themes: ThemeConfig[] = [];
  public variant: string = this.theme.activeTheme.value.variant;
  public activeTheme: ActiveTheming;

  constructor(
    private navParams: NavParams,
    public theme: GlobalThemeService,
    private modalCtrl: ModalController
  ) {
    this.themes = this.theme.getAvailableThemeConfigs().map(c => {
      return { ...c, title: c.key }; // TODO: translation for title instead of key
    });

    this.theme.activeTheme.subscribe(activeTheme => this.activeTheme = activeTheme);
  }

  ngOnInit(): void {
    this.options = this.navParams.data as ColorChooserComponentOptions;
  }

  ionViewWillEnter() {
  }

  public getThemeColor(theme: ThemeConfig): string {
    return theme.variants[this.theme.activeTheme.value.variant].color;
  }

  public chooseTheme(theme: ThemeConfig) {
    // Set new theme
    void this.theme.setThemeConfig(theme);

    // Exit the chooser
    void this.modalCtrl.dismiss();
  }

  public getThemeTitle(theme: ThemeConfig): string {
    return this.theme.getThemeTitle(theme);
  }
}
