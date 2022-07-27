import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { WidgetsService } from 'src/app/launcher/widgets/services/widgets.service';
import { GlobalThemeService } from '../../../../services/global.theme.service';

@Component({
  selector: 'widget-holder',
  templateUrl: './widget-holder.component.html',
  styleUrls: ['./widget-holder.component.scss'],
})
export class WidgetHolderComponent implements OnInit {
  @ViewChild('container', { static: true, read: ViewContainerRef })
  public container: ViewContainerRef;

  public editing = false;

  constructor(
    public theme: GlobalThemeService,
    private widgetsService: WidgetsService
  ) { }

  ngOnInit() {
    this.widgetsService.editionMode.subscribe(editionMode => this.editing = editionMode);
  }
}
