import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { IActionSheetButtonConfig, IActionSheetConfig } from './action-sheet.config';

@Component({
    selector: 'action-sheet',
    templateUrl: './action-sheet.component.html',
    styleUrls: ['./action-sheet.component.scss'],
  })
  export class ActionSheetComponent implements OnInit {
    public config: IActionSheetConfig;
    public readyToDisplay = false;
  
    constructor(
      private modalCtrl: ModalController,
      private navParams: NavParams
    ) {
      this.config = this.navParams.get('config');
    }
  
    ngOnInit() {}
  
    ionViewWillEnter() {
      this.readyToDisplay = false;
    }
  
    ionViewDidEnter() {
      // Animate boxes appearance with a fade in.
      setTimeout(() => {
        this.readyToDisplay = true;
      }, 100);
    }

    getIcon(icon){
        return `../../../assets/actionsheet/${icon}.svg`
    }

    doAction(item: IActionSheetButtonConfig)
    {
        item.action();
        this.modalCtrl.dismiss(null);
    }
  
    backgroundClicked(dismissIfId: string, event: MouseEvent) {
        
        const target: any = event.target;
        console.log("dismiss", dismissIfId, target.id)
        if (target.id === dismissIfId) {
          this.cancel();
        }
      }
  
    cancel() {

      console.log("Cancel")
      if (this.config.cancelCallback) {
        this.config.cancelCallback();
      }
  
      this.modalCtrl.dismiss(null);
    }
  }