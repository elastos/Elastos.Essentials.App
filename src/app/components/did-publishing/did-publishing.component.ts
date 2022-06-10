import { Component, NgZone, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Logger } from 'src/app/logger';
import { DIDPublicationStatus, GlobalPublicationService } from 'src/app/services/global.publication.service';
import { GlobalThemeService } from 'src/app/services/global.theme.service';

@Component({
  selector: 'app-did-publishing',
  templateUrl: './did-publishing.component.html',
  styleUrls: ['./did-publishing.component.scss'],
})
export class DIDPublishingComponent implements OnInit {
  public publishing = false;
  public publicationSuccessful = false;
  public publicationFailed = false;
  private publicationStatusSub: Subscription;

  constructor(
    public theme: GlobalThemeService,
    private zone: NgZone,
    private modalCtrl: ModalController,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
  }

  ionViewWillEnter() {
    this.publishing = true;
    this.publicationSuccessful = false;
    this.publicationFailed = false;

    // Listen to publication event
    this.publicationStatusSub = GlobalPublicationService.instance.publicationStatus.subscribe((status)=>{
      if (status.status == DIDPublicationStatus.AWAITING_PUBLICATION_CONFIRMATION) {
        this.publishing = true;
      }
      else if (status.status == DIDPublicationStatus.PUBLISHED_AND_CONFIRMED) {
        Logger.log("global", "Identity publication success");

        this.zone.run(() => {
          // Successfully published
          this.publishing = false;
          this.publicationSuccessful = true;
        });

        // Show the successful result and automatically exit this screen.
        setTimeout(() => {
          this.exitComponent();
        }, 4000);
      }
      else if (status.status == DIDPublicationStatus.FAILED_TO_PUBLISH) {
        Logger.log("global", "Identity publication failure");

        this.zone.run(() => {
          // Failed to publish
          this.publishing = false;
          this.publicationFailed = true;
        });
      }
    });
  }

  exitComponent() {
    if (this.publicationStatusSub) {
      this.publicationStatusSub.unsubscribe();
      this.publicationStatusSub = null;
    }
    void this.modalCtrl.dismiss();
  }
}
