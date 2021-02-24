import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { ThemeService } from '../../../services/theme.service';
import { DidmanagerService } from '../../services/didmanager.service';

@Component({
  selector: 'app-options',
  templateUrl: './options.component.html',
  styleUrls: ['./options.component.scss'],
})
export class OptionsComponent implements OnInit {

  constructor(
    public theme: ThemeService,
    private didService: DidmanagerService,
    private popoverCtrl: PopoverController,
  ) { }

  ngOnInit() {
  }

  signOut() {
    this.popoverCtrl.dismiss();
    this.didService.signOut();
  }

  shareIdentity() {
    this.popoverCtrl.dismiss();
    this.didService.shareIdentity();
  }
}
