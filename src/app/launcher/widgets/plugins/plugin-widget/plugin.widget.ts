import { Component } from '@angular/core';
import { AppmanagerService } from 'src/app/launcher/services/appmanager.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { PluginConfig } from '../../base/plugin.types';
import { Widget } from '../../base/widget.interface';

@Component({
  selector: 'widget-plugin',
  templateUrl: './plugin.widget.html',
  styleUrls: ['./plugin.widget.scss'],
})
export class PluginWidget implements Widget {
  public forSelection: boolean; // Initialized by the widget service

  public config: PluginConfig<any> = null;

  constructor(
    public theme: GlobalThemeService,
    public appService: AppmanagerService,
  ) { }

  onWidgetInit(): Promise<void> {
    return;
  }

  onWidgetDeinit(): Promise<void> {
    return;
  }

  public setPluginconfig(config: PluginConfig<any>) {
    console.log("setPluginconfig config", config)
    this.config = config;
  }
}
