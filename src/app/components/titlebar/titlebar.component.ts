import { Component, OnInit } from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { TitlebarService } from 'src/app/services/titlebar.service';

@Component({
  selector: 'app-titlebar',
  templateUrl: './titlebar.component.html',
  styleUrls: ['./titlebar.component.scss'],
})
export class TitleBarComponent implements OnInit {

  constructor(
    public titlebarService: TitlebarService,
    public theme: ThemeService
  ) {
  }

  ngOnInit() { }
}
