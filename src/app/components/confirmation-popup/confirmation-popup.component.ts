import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';


@Component({
  selector: 'app-confirmation-popup',
  templateUrl: './confirmation-popup.component.html',
  styleUrls: ['./confirmation-popup.component.scss'],
})
export class ConfirmationPopupComponent implements OnInit {

  @Output() cancelEvent = new EventEmitter<boolean>();

  public type: 'danger'; // TODO: warning, info...
  public title: string;
  public text: string;

  constructor(
    private popover: PopoverController,
    private navParams: NavParams,
    public translate: TranslateService,
    public theme: GlobalThemeService
  ) { }

  ngOnInit() {
    this.type = this.navParams.get('type') || 'danger';
    this.title = this.navParams.get('title');
    this.text = this.navParams.get('text');
  }

  confirm() {
    void this.popover.dismiss(true);
  }

  cancel() {
    void this.popover.dismiss(false);
  }
}
