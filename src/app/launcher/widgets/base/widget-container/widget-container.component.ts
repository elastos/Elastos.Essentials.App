import { Component, Input, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { WidgetsService } from 'src/app/launcher/widgets/services/widgets.service';
import { GlobalThemeService } from '../../../../services/global.theme.service';
import { WidgetsBuilder } from '../../services/widgets.builder';

@Component({
  selector: 'widget-container',
  templateUrl: './widget-container.component.html',
  styleUrls: ['./widget-container.component.scss'],
})
export class WidgetContainerComponent implements OnInit {
  @ViewChild('container', { static: true, read: ViewContainerRef }) container: ViewContainerRef;

  @Input("name") // Unique identifier for a container among others, to ave its context.
  private name: string = null;

  constructor(
    public theme: GlobalThemeService,
    private widgetsService: WidgetsService
  ) { }

  ngOnInit() {
    if (!this.name)
      throw new Error("Widget container must have a 'name'.");

    void this.widgetsService.loadContainerState(this.name).then(async state => {
      // Container state is loaded, generate the widgets
      for (let widget of state.widgets) {
        await WidgetsBuilder.appendWidgetFromState(widget, this.container);
      }
    });
  }

  /**
   * Open the widget selector to add a new widget to this container
   */
  public addWidget() {
    void this.widgetsService.addWidget(this.name, this.container);
  }
}
