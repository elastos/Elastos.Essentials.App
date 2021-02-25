import { Component, OnInit } from '@angular/core';
import { TitlebarService } from 'src/app/services/titlebar.service';

@Component({
  selector: 'app-titlebarmenuitem',
  templateUrl: './titlebarmenuitem.component.html',
  styleUrls: ['./titlebarmenuitem.component.scss'],
})
export class TitlebarmenuitemComponent implements OnInit {

  constructor(
    public titlebarService: TitlebarService
  ) { }

  ngOnInit() {}

}
