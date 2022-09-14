import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { BuiltInIcon, TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem } from 'src/app/components/titlebar/titlebar.types';
import { WidgetsService } from 'src/app/launcher/widgets/services/widgets.service';
import { Logger } from 'src/app/logger';
import { Util } from 'src/app/model/util';
import { GlobalIntentService } from 'src/app/services/global.intent.service';
import { GlobalNativeService } from 'src/app/services/global.native.service';
import { GlobalThemeService } from '../../../../services/global.theme.service';
import { WidgetPluginsService } from '../../services/plugin.service';
import { WidgetContainerComponent } from '../widget-container/widget-container.component';
import { DisplayCategories as DisplayCategory, WidgetState } from '../widgetstate';

/* TODO:
download json by the widget service
return a widget state
add widget state into preview container
select button, add to home
if selected, also save to available custom widgets for later reuse
*/

type Category = {
  key: DisplayCategory; // Key matching widgets
  title: string; // Display name
}

@Component({
  selector: 'widget-chooser',
  templateUrl: './widget-chooser.component.html',
  styleUrls: ['./widget-chooser.component.scss'],
})
export class WidgetChooserComponent implements OnInit, OnDestroy {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  private widgetContainer: WidgetContainerComponent;
  @ViewChild("widgetContainer", { static: false }) set widgetContainerContent(content: WidgetContainerComponent) {
    if (content) {
      this.widgetContainer = content;
      void this.prepareWidgetsList();
    }
  }

  private previewContainer: WidgetContainerComponent;
  @ViewChild("previewContainer", { static: false }) set previewContainerContent(content: WidgetContainerComponent) {
    console.log("previewContainer", content)
    if (content) {
      this.previewContainer = content;
    }
  }

  private titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  private receivedIntent: EssentialsIntentPlugin.ReceivedIntent;

  public categories: Category[] = [];
  public selectedCategory: Category = null;
  public widgetUrl = "";
  public addingCustomWidget = false;
  public customWidgetState: WidgetState = null; // Fetched widget state after adding a custom widget by user.
  public hasCustomWidgets = false;

  private alreadySentIntentResponse = false;

  private pluginsListSub: Subscription = null;

  constructor(
    public theme: GlobalThemeService,
    private widgetsService: WidgetsService,
    private widgetPluginsService: WidgetPluginsService,
    private translate: TranslateService,
    private router: Router,
    private zone: NgZone,
    private clipboard: Clipboard,
    private native: GlobalNativeService,
    private globalIntentService: GlobalIntentService
  ) { }

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    if (!Util.isEmptyObject(navigation.extras.state)) {
      this.receivedIntent = <EssentialsIntentPlugin.ReceivedIntent>navigation.extras.state.intent;
    }

    this.categories = [
      { key: DisplayCategory.FINANCE, title: "Finance" },
      { key: DisplayCategory.IDENTITY, title: "Identity" },
      { key: DisplayCategory.BROWSER, title: "Browser" },
      { key: DisplayCategory.ELASTOS, title: "Elastos tech" },
      { key: DisplayCategory.COMMUNITY, title: "Community" },
      { key: DisplayCategory.DAPPS, title: "dApps" }
    ];
    this.selectedCategory = this.categories[0];

    this.pluginsListSub = this.widgetPluginsService.onAvailableCustomPluginsListChanged.subscribe(() => {
      // Refresh the available custom dapps list when a custom widget is added or removed
      void this.prepareWidgetsList();
    });
  }

  ngOnDestroy(): void {
    if (this.pluginsListSub) {
      this.pluginsListSub.unsubscribe();
      this.pluginsListSub = null;
    }
  }

  ionViewWillEnter() {
    this.titleBar.setTitle(this.translate.instant('Add a widget'));

    this.titleBar.setNavigationMode(null);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, {
      key: "close",
      iconPath: BuiltInIcon.CLOSE
    });
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, {
      key: "add-custom",
      iconPath: BuiltInIcon.ADD
    });

    this.titleBar.addOnItemClickedListener(this.titleBarIconClickedListener = (icon) => {
      switch (icon.key) {
        case 'close':
          this.dismiss(null);
          return;
        case 'add-custom':
          this.enterAddCustomWidgetMode();
          return;
      }
    });

    this.alreadySentIntentResponse = false;
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  private async prepareWidgetsList() {
    this.widgetContainer.emptyAllWidgets();

    // Build widgets instances for preview and selection
    let filteredWidgets: WidgetState[];

    if (this.selectedCategory.key !== DisplayCategory.DAPPS) {
      // Built in widgets
      let builtInWidgets = this.widgetsService.getAvailableBuiltInWidgets();
      filteredWidgets = builtInWidgets.filter(w => w.displayCategories.includes(this.selectedCategory.key))
    }
    else {
      // dApps widgets
      let customPluginsList = await this.widgetPluginsService.getAvailableCustomWidgets();
      filteredWidgets = Object.values(customPluginsList);

      this.hasCustomWidgets = filteredWidgets.length > 0;
    }

    for (let widget of filteredWidgets) {
      let result = await this.widgetContainer.addPreviewWidget(widget);
      if (result) {
        let { widgetHolderComponentRef } = result;
        widgetHolderComponentRef.instance.onWidgetSelected.subscribe(widgetState => {
          // User has picked this widget from the selection list, we can dismiss and return the result.
          this.dismiss(widgetState);
        });
      }
    }
  }

  public shouldShowNoDAppWidgetRecommendation() {
    return this.selectedCategory.key === DisplayCategory.DAPPS && !this.hasCustomWidgets;
  }

  private enterAddCustomWidgetMode() {
    this.addingCustomWidget = true;
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_RIGHT, null);
  }

  public async paste() {
    this.widgetUrl = await this.clipboard.paste();
    void this.fetchWidget();
  }

  public async scan() {
    let res: { result: { scannedContent: string } } = await this.globalIntentService.sendIntent("https://scanner.elastos.net/scanqrcode", {}, this.receivedIntent.intentId);

    this.widgetUrl = res.result.scannedContent;
    void this.fetchWidget();
  }

  private async fetchWidget() {
    if (!this.widgetUrl || !this.widgetUrl.toLowerCase().startsWith("http"))
      return;

    let fetchResult = await this.widgetsService.fetchWidgetPluginAndCreate(this.widgetUrl);
    if (fetchResult.newsSourceAdded) {
      // News source added, show a toast and automatically exit the chooser without adding a new news widget
      this.native.genericToast("News source added to your existing news widget!", 4000);
      this.dismiss(null);
      return;
    }

    this.customWidgetState = fetchResult.widgetState;
    Logger.log("widgets", "Fetched widget state:", this.customWidgetState);

    // Give time to the UI to make the preview container visible before trying to access it
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      void this.zone.run(async () => {
        // Create the custom widget in the preview container
        let result = await this.previewContainer.addPreviewWidget(this.customWidgetState);
        if (result) {
          let { widgetHolderComponentRef } = result;
          // eslint-disable-next-line @typescript-eslint/no-misused-promises, require-await
          widgetHolderComponentRef.instance.onWidgetSelected.subscribe(async widgetState => {
            // User has picked this widget from the selection list, we can dismiss and return the result.
            // But we first save this widget in the available custom plugins list for alter reuse
            // await this.widgetPluginsService.saveDAppPluginAsAvailableWidget(widgetState);
            // TODO: delete the 3 above lines,
            this.dismiss(widgetState);
          });
        }
      });
    }, 1000);
  }

  private dismiss(widgetState: WidgetState) {
    this.alreadySentIntentResponse = true;
    void this.globalIntentService.sendIntentResponse({
      widgetState
    }, this.receivedIntent.intentId);
  }

  public selectCategory(category: Category) {
    if (this.selectedCategory == category)
      return;

    this.selectedCategory = category;

    void this.prepareWidgetsList();
  }
}
