import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

@Component({
  selector: 'ebutton',
  templateUrl: './ebutton.component.html',
  styleUrls: ['./ebutton.component.scss'],
})
export class EButtonComponent implements OnInit {
  @Input()
  public title = "";

  @Input()
  public mode: "default" | "cancel" = "default";

  @Input()
  public disabled = false;

  @Input("lefticon")
  public leftIcon: string = null;

  @Input("topicon")
  public topIcon: string = null;

  @Output()
  public clicked?= new EventEmitter();

  constructor(
    public theme: GlobalThemeService
  ) { }

  ngOnInit() {

  }

  public onClicked() {
    if (!this.disabled)
      this.clicked.emit();
  }
}
