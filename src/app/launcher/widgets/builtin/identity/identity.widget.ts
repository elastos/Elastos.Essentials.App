import { Component, OnInit } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'widget-identity',
  templateUrl: './identity.widget.html',
  styleUrls: ['./identity.widget.scss'],
})
export class IdentityWidget implements OnInit {
  public text = "";

  constructor(
    public theme: GlobalThemeService,
  ) { }

  ngOnInit() {
  }
}
