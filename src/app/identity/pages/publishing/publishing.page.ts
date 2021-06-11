import { Component, ViewChild, NgZone, OnInit } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalPublicationService, DIDPublicationStatus } from 'src/app/services/global.publication.service';
import { ProfileService } from '../../services/profile.service';
import { Native } from '../../services/native';
import { DIDService } from '../../services/did.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { analyzeAndValidateNgModules } from '@angular/compiler';
import { Logger } from 'src/app/logger';

@Component({
  selector: 'app-publishing',
  templateUrl: './publishing.page.html',
  styleUrls: ['./publishing.page.scss'],
})
export class PublishingPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public publishing = false;
  public publicationSuccessful = false;
  public publicationFailed = false;
  private publicationStatusSub: Subscription;

  constructor(
    public theme: GlobalThemeService,
    private didService: DIDService,
    public profileService: ProfileService,
    private publicationService: GlobalPublicationService,
    private zone: NgZone,
    private route: ActivatedRoute,
    private native: Native
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params: { payload: any, memo: string }) => {
      // Start the publishing
      this.publishing = true;
      void this.publicationService.publishDIDOnAssist(
        this.didService.getActiveDid().getDIDString(),
        params.payload, params.memo);
    });
  }

  async ionViewWillEnter() {
    this.titleBar.setTitle('Publish Progress');

    this.publishing = true;
    this.publicationSuccessful = false;
    this.publicationFailed = false;

    // Listen to publication event
    await this.publicationService.resetStatus();
    this.publicationStatusSub = this.publicationService.publicationStatus.subscribe((status)=>{
      if (status.status == DIDPublicationStatus.PUBLISHED_AND_CONFIRMED) {
        Logger.log("identity", "Identity publication success");

        // Successfully published
        this.publishing = false;
        this.publicationSuccessful = true;

        // Show the successful result and automatically exit this screen.
        setTimeout(() => {
          this.returnHome();
        }, 4000);
      }
      else if (status.status == DIDPublicationStatus.FAILED_TO_PUBLISH) {
        Logger.log("identity", "Identity publication failure");

        // Failed to publish
        this.publishing = false;
        this.publicationFailed = true;
      }
    });
  }

  returnHome() {
    this.publicationStatusSub.unsubscribe();
    void this.native.setRootRouter('/identity/myprofile/home');
  }
}
