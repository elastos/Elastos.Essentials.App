import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Profile } from '../../model/profile.model';
import { ModalController, NavParams } from '@ionic/angular';
import { AdvancedPopupConfig } from './advancedpopupconfig.model';

@Component({
    selector: 'advanced-popup',
    templateUrl: './advancedpopup.component.html',
    styleUrls: ['./advancedpopup.component.scss'],
})
export class AdvancedPopupComponent implements OnInit {
    @Input('profile') profile: Profile = new Profile();

    public config: AdvancedPopupConfig;
    public readyToDisplay = false;

    constructor(private modalCtrl: ModalController, private navParams: NavParams) {
        this.config = navParams.get("config");
    }

    ngOnInit() { }

    ionViewWillEnter() {
        this.readyToDisplay = false;
    }

    ionViewDidEnter() {
        // Animate boxes appearance with a fade in.
        setTimeout(()=>{
            this.readyToDisplay = true;
        },100)
    }

    /**
     * Auto-close (outside click) the modal in case we click on the "dismissIfId" DOM item.
     */
    backgroundClicked(dismissIfId: string, event: MouseEvent) {
        let target:any = event.target;
        if (target.id == dismissIfId)
            this.cancel();
    }

    confirm() {
        if (this.config.prompt.confirmCallback)
            this.config.prompt.confirmCallback();

        this.modalCtrl.dismiss(null);
    }

    cancel() {
        if (this.config.prompt.cancelCallback)
            this.config.prompt.cancelCallback();

        this.modalCtrl.dismiss(null);
    }
}
