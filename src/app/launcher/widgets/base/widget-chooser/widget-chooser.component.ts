import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { WidgetsService } from 'src/app/launcher/widgets/services/widgets.service';
import { GlobalThemeService } from '../../../../services/global.theme.service';
import { WidgetContainerComponent } from '../widget-container/widget-container.component';
import { WidgetState } from '../widgetcontainerstate';

@Component({
  selector: 'widget-chooser',
  templateUrl: './widget-chooser.component.html',
  styleUrls: ['./widget-chooser.component.scss'],
})
export class WidgetChooserComponent implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
  @ViewChild(WidgetContainerComponent, { static: true }) widgetContainer: WidgetContainerComponent;

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  constructor(
    public theme: GlobalThemeService,
    private widgetsService: WidgetsService,
    private translate: TranslateService,
    private modalCtrl: ModalController
  ) {

  }

  ngOnInit() {
  }

  async ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('Add a widget'));

    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, {
      key: "close",
      iconPath: BuiltInIcon.CLOSE
    });

    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      switch (icon.key) {
        case 'close':
          this.dismiss(null);
          return;
      }
    });

    // Build widgets instances for preview and selection
    let builtInWidgets = this.widgetsService.getAvailableBuiltInWidgets();

    for (let widget of builtInWidgets) {
      let { widgetHolderComponentRef } = await this.widgetContainer.addPreviewWidget(widget);
      widgetHolderComponentRef.instance.onWidgetSelected.subscribe(widgetState => {
        // User has picked this widget from the selection list, we can dismiss and return the result.
        this.dismiss(widgetState);
      });
    }
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  private dismiss(result: WidgetState) {
    void this.modalCtrl.dismiss({
      widgetState: result
    });
  }
}
