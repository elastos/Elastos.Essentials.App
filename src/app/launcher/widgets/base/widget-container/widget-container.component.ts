import { DragDrop, DragRef, DropListRef } from '@angular/cdk/drag-drop';
import { Component, ComponentRef, Input, OnInit, TemplateRef, ViewChild, ViewContainerRef, ViewRef } from '@angular/core';
import { WidgetInstance, WidgetsService } from 'src/app/launcher/widgets/services/widgets.service';
import { GlobalThemeService } from '../../../../services/global.theme.service';
import { WidgetsUIService } from '../../services/widgets.ui.service';
import { WidgetHolderComponent } from '../widget-holder/widget-holder.component';
import { WidgetState } from '../widgetcontainerstate';

@Component({
  selector: 'widget-container',
  templateUrl: './widget-container.component.html',
  styleUrls: ['./widget-container.component.scss'],
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

  constructor(
    public theme: GlobalThemeService,
    private widgetsService: WidgetsService,
    private widgetsUIService: WidgetsUIService,
    private dragDrop: DragDrop
  ) { }

  ngOnInit() {
    if (this.inLiveMode()) {
      if (!this.name)
        throw new Error("Widget container must have a 'name'.");

      this.cdkList = this.dragDrop.createDropList(this.widgetslist.element);

      void this.widgetsService.loadContainerState(this.name).then(async state => {
        // Container state is loaded, generate the widgets
        this.dragRefs = [];
        for (let widget of state.widgets) {
          let { dragRef } = await this.widgetsService.restoreWidget(this, widget, this.widgetslist, this.container, this.widgetsBoundaries, this.dragPlaceholder);
          this.dragRefs.push(dragRef);
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

      this.widgetsService.editionMode.subscribe(editing => {
        this.cdkList.disabled = !editing;
        this.editing = editing;
      });
    }
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
        let { dragRef } = await this.widgetsService.addWidget(selectedWidgetState, this, this.widgetslist, this.container, this.widgetsBoundaries, this.dragPlaceholder);

        this.dragRefs.push(dragRef);
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
}
