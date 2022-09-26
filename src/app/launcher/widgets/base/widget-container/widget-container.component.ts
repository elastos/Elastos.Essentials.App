import {
  animate, state,
  style, transition, trigger
} from '@angular/animations';
import { DragDrop, DragRef, DropListRef } from '@angular/cdk/drag-drop';
import { Component, ComponentRef, Input, OnInit, TemplateRef, ViewChild, ViewContainerRef, ViewRef } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { WidgetInstance, WidgetsService } from 'src/app/launcher/widgets/services/widgets.service';
import { GlobalThemeService } from '../../../../services/theming/global.theme.service';
import { WidgetPluginsService } from '../../services/plugin.service';
import { WidgetsServiceEvents } from '../../services/widgets.events';
import { WidgetsUIService } from '../../services/widgets.ui.service';
import { ColorChooserComponent } from '../color-chooser/color-chooser.component';
import { WidgetHolderComponent } from '../widget-holder/widget-holder.component';
import { WidgetState } from '../widgetstate';
@Component({
  selector: 'widget-container',
  templateUrl: './widget-container.component.html',
  styleUrls: ['./widget-container.component.scss'],
  animations: [
    // the fade-in/fade-out animation.
    trigger('simpleFadeAnimation', [
      // the "in" style determines the "resting" state of the element when it is visible.
      state('in', style({ opacity: 1 })),

      // fade in when created. this could also be written as transition('void => *')
      transition(':enter', [
        style({ opacity: 0 }),
        animate(500)
      ]),

      // fade out when destroyed. this could also be written as transition('void => *')
      /* transition(':leave',
        animate(400, style({ opacity: 0 }))) */
    ])
  ]
})
export class WidgetContainerComponent implements OnInit {
  @ViewChild('widgetslist', { static: true, read: ViewContainerRef }) widgetslist: ViewContainerRef;
  @ViewChild('widgetsboundaries', { static: true, read: ViewContainerRef }) widgetsBoundaries: ViewContainerRef;
  @ViewChild('container', { static: true, read: ViewContainerRef }) container: ViewContainerRef;
  @ViewChild('dragplaceholder', { static: true, read: TemplateRef }) dragPlaceholder: TemplateRef<any>;

  @Input("name") // Unique identifier for a container among others, to ave its context.
  public name: string = null;

  @Input("mode")
  public mode: "live" | "select" = "live"; // Live: real user mode with saved state machine, sorting, deletion. Select: selector mode with previews

  private cdkList: DropListRef;
  private dragRefs: DragRef[] = [];
  public editing = false;

  private holdersInstances: ComponentRef<WidgetHolderComponent>[] = []; // List of all widget holders initiated in this contained. Used to destroy those references when the container gets destroyed

  constructor(
    public theme: GlobalThemeService,
    private widgetsService: WidgetsService,
    private widgetsPluginsService: WidgetPluginsService,
    private widgetsUIService: WidgetsUIService,
    private dragDrop: DragDrop,
    private modalCtrl: ModalController,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    if (this.inLiveMode()) {
      if (!this.name)
        throw new Error("Widget container must have a 'name'.");

      this.loadContainer();

      WidgetsServiceEvents.editionMode.subscribe(editing => {
        this.cdkList.disabled = !editing;
        this.editing = editing;
      });
    }
  }

  private loadContainer() {
    this.cdkList = this.dragDrop.createDropList(this.widgetslist.element);

    void this.widgetsService.loadContainerState(this.name).then(async state => {
      // Container state is loaded, generate the widgets
      this.dragRefs = [];
      for (let widget of state.widgets) {
        let result = await this.widgetsService.restoreWidget(this, widget, this.widgetslist, this.container, this.widgetsBoundaries, this.dragPlaceholder);
        if (result) {
          let { dragRef, widgetHolderComponentRef } = result;
          this.dragRefs.push(dragRef);
          this.holdersInstances.push(widgetHolderComponentRef);
        }
      }

      this.cdkList.withItems(this.dragRefs);
      this.cdkList.disabled = true; // Initially disabled. Only allow moving items when in edition mode

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.cdkList.dropped.subscribe(async event => {
        // Move on UI model
        this.container.move(this.container.get(event.previousIndex), event.currentIndex)

        // Move in state machine
        await this.widgetsService.moveWidget(this.name, event.previousIndex, event.currentIndex);
      });
    });
  }

  /**
   * Widget is being deleted by the service. We remove it from UI
   */
  public onWidgetDeletion(widgetInstance: WidgetInstance, holderViewRef: ViewRef) {
    let deletionIndex = this.container.indexOf(holderViewRef);

    // Remove the widget holder view from the widgets list
    this.container.remove(deletionIndex);

    // Remove from the drag refs array and update the drag list items
    this.dragRefs.splice(deletionIndex, 1);
    this.cdkList.withItems(this.dragRefs);

    // No widget remaining? Exit the edition mode automatically
    if (this.container.length === 0)
      this.widgetsService.exitEditionMode();
  }

  /**
   * Open the widget selector to add a new widget to this container
   */
  public addWidget() {
    void this.widgetsUIService.selectWidget().then(async selectedWidgetState => {
      if (selectedWidgetState) {
        let { dragRef, widgetHolderComponentRef } = await this.widgetsService.addWidget(selectedWidgetState, this, this.widgetslist, this.container, this.widgetsBoundaries, this.dragPlaceholder);

        this.dragRefs.push(dragRef);
        this.holdersInstances.push(widgetHolderComponentRef);
        this.cdkList.withItems(this.dragRefs);
      }
    });
  }

  /**
   * Called externally by the widget chooser to add preview widgets for selection.
   */
  public addPreviewWidget(widgetState: WidgetState): Promise<{ widgetHolderComponentRef: ComponentRef<WidgetHolderComponent> }> {
    if (!this.inSelectionMode())
      throw new Error("addPreviewWidget() can be called only in select mode");

    return this.widgetsService.addWidget(widgetState, this, this.widgetslist, this.container, this.widgetsBoundaries, this.dragPlaceholder, true);
  }

  public inSelectionMode(): boolean {
    return this.mode === "select";
  }

  public inLiveMode(): boolean {
    return this.mode === "live";
  }

  public exitEdition() {
    this.widgetsService.exitEditionMode();
  }

  /**
   * Removes all widgets from the widget list but without touching the model.
   * This is used by the widget choose to toggle various widget category filters.
   */
  public emptyAllWidgets() {
    // TODO: we probably need to ask the widget service to de-init the widget coponents here!

    this.container.clear();
    this.widgetslist.clear();
    this.cdkList = null;
    this.dragRefs = [];
  }

  public openColorChooser() {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
    return new Promise(async resolve => {
      const modal = await this.modalCtrl.create({
        component: ColorChooserComponent,
        componentProps: {},
        backdropDismiss: true, // Closeable
        cssClass: 'popup-base color-chooser-component ' + (this.theme.darkMode ? 'darkContainer' : '')
      });

      void modal.onDidDismiss().then((response: { data?: boolean }) => {
        resolve(!!response.data); // true or undefined
      });

      void modal.present();
    });
  }

  public toggleThemeVariant() {
    void this.theme.toggleThemeVariant();
  }

  public getActiveThemeColorName(): string {
    return this.theme.getThemeTitle(this.theme.activeTheme.value.config);
  }

  public getActiveThemeVariantName(): string {
    return this.translate.instant('launcher.theme-variant-' + this.theme.activeTheme.value.variant);
  }

  public async restoreAllWidgets() {
    await this.widgetsService.resetAllWidgets();

    this.emptyAllWidgets();
    this.loadContainer();
  }
}
