import { Component, ElementRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { Subject } from 'rxjs';
import { WidgetsService } from 'src/app/launcher/widgets/services/widgets.service';
import { GlobalThemeService } from '../../../../services/global.theme.service';
import { WidgetState } from '../widgetcontainerstate';

@Component({
  selector: 'widget-holder',
  templateUrl: './widget-holder.component.html',
  styleUrls: ['./widget-holder.component.scss'],
})
export class WidgetHolderComponent implements OnInit {
  public root: ElementRef;

  @ViewChild('container', { static: true, read: ViewContainerRef })
  public container: ViewContainerRef;

  @ViewChild('dragHandle', { static: true, read: ElementRef })
  public dragHandle: ElementRef;

  private widgetState: WidgetState = null;

  public editing = false;
  public selecting = false;

  public onWidgetSelected = new Subject<WidgetState>();

  constructor(
    public theme: GlobalThemeService,
    private widgetsService: WidgetsService,
    elRef: ElementRef, // To get the root component instance
  ) {
    this.root = elRef;
  }

  ngOnInit() {
    this.widgetsService.editionMode.subscribe(editionMode => this.editing = editionMode);
  }

  public attachWidgetInfo(widgetState: WidgetState) {
    this.widgetState = widgetState;
  }

  async deleteWidget() {
    await this.widgetsService.deleteWidget(this.widgetState.id);
  }

  public disablerTouchStart(ev: TouchEvent) {
    // Interrupt all touch events to items behind the disabler
    ev.preventDefault();
    ev.stopImmediatePropagation();
  }

  /**
   * User has selected a widget, let listeners (widget container) know.
   */
  public selectWidget() {
    this.onWidgetSelected.next(this.widgetState);
  }
}
