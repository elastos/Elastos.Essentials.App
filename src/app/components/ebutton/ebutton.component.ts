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
  public mode: "default" | "cancel" | "danger" = "default";

  @Input()
  public disabled = false;

  @Input()
  public uppercase = false;

  @Input()
  public spinning = false;

  @Input()
  public small = false; // Less padding, smaller text

  @Input("roundedicon")
  public roundedIcon = false; // Icon rendered as a circle if true

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
    if (!this.disabled && !this.spinning)
      this.clicked.emit();
  }

  public leftIconShouldBeCached(): boolean {
    return !!this.leftIcon && this.leftIcon.startsWith("http")
  }

  public topIconShouldBeCached(): boolean {
    return !!this.topIcon && this.topIcon.startsWith("http")
  }
}
