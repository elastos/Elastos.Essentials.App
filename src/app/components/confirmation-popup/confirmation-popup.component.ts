import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';

export type ConfirmationPopupComponentParams = {
  type: "danger" | "custom";
  customIcon?: string; // For custom type, path to the logo
  title: string;
  text: string;
  confirmationButtonText?: string;
}

@Component({
  selector: 'app-confirmation-popup',
  templateUrl: './confirmation-popup.component.html',
  styleUrls: ['./confirmation-popup.component.scss'],
})
export class ConfirmationPopupComponent implements OnInit {

  @Output() cancelEvent = new EventEmitter<boolean>();

  public type: 'danger' | 'custom';
  public customIcon?: string;
  public title: string;
  public text: string;
  public confirmationButtonText?: string;

  constructor(
    private popover: PopoverController,
    private navParams: NavParams,
    public translate: TranslateService,
    public theme: GlobalThemeService
  ) { }

  ngOnInit() {
    this.type = this.navParams.get('type') || 'danger';
    this.customIcon = this.navParams.get('customIcon');
    this.title = this.navParams.get('title');
    this.text = this.navParams.get('text');
    this.confirmationButtonText = this.navParams.get('confirmationButtonText') || this.translate.instant('common.confirm');
  }

  confirm() {
    void this.popover.dismiss(true);
  }

  cancel() {
    void this.popover.dismiss(false);
  }
}
