import { Component, OnInit, ViewChild, NgZone } from '@angular/core';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { GlobalPublicationService, DIDPublicationStatus } from 'src/app/services/global.publication.service';
import { ProfileService } from '../../services/profile.service';
import { Native } from '../../services/native';
import * as moment from 'moment';


@Component({
  selector: 'app-publishing',
  templateUrl: './publishing.page.html',
  styleUrls: ['./publishing.page.scss'],
})
export class PublishingPage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  public startFlow = false;
  public progress = 0;
  public showSpinner = false;
  public suggestRestartingFromScratch = false;

  constructor(
    public theme: GlobalThemeService,
    public profileService: ProfileService,
    private publicationService: GlobalPublicationService,
    private zone: NgZone,
    private native: Native
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.init();
  }

  async init() {
    await this.publicationService.init();
    this.startFlow = true;
    this.titleBar.setTitle('Publish Progress');
    this.resumeIdentitySetupFlow();
  }

  /**
   * Continues the identity creation process where it was stopped.
   */
  private async resumeIdentitySetupFlow() {
    await new Promise<void>((resolve)=>{
      setTimeout(async ()=>{
        try {
          if (!this.isDIDBeingPublished() && !this.isDIDOnChain()) {
            this.progress = 0.01;
            let interval = setInterval(() => {
              if(this.progress >= 0.99) {
                clearInterval(interval);
              } else {
                this.progress += 0.01;
                this.publicationService.persistentInfo.did.progressDate = new Date();
                this.publicationService.persistentInfo.did.progress = this.progress;
                this.publicationService.savePersistentInfo(this.publicationService.persistentInfo);
              }
            }, 10000);
            await this.publicationService.publishIdentity();
          }

          if (this.isDIDBeingPublished() && !this.isDIDOnChain()) {
            const progressDate = this.publicationService.persistentInfo.did.progressDate;
            const progress = this.publicationService.persistentInfo.did.progress;
            let newProgress: number = null;

            // If progress was previously initiated before starting app
            if(progressDate && progress) {
              console.log('Last progress time', moment(progressDate).format('LT'));
              console.log('Left off at progress', progress);

              // Get saved date
              const before = moment(progressDate);
              const now = moment(new Date());
              // Find duration in seconds between saved date and now
              const duration = moment.duration(now.diff(before));
              const durationInSeconds = duration.asSeconds();
              console.log('Progress in between in seconds', durationInSeconds);
              // Divide duration in a way progress can handle. ex: 10 seconds / 1000 = 0.01 which is 1%
              const additionalProgress = durationInSeconds / 1000;
              console.log('Progress while user was absent', additionalProgress);
              // Add new progress to saved progress
              newProgress = additionalProgress + progress;
            }

            if(newProgress && newProgress <= 0.99) {
              this.progress = newProgress
            } else if(this.progress >= 0.99) {
              this.progress = 0.99;
            } else {
              this.progress = 0.01;
            }

            console.log('Progress', this.progress);
            let interval = setInterval(() => {
              if(this.progress >= 0.99) {
                clearInterval(interval);
              } else {
                this.progress += 0.01;
                this.publicationService.persistentInfo.did.progressDate = new Date();
                this.publicationService.persistentInfo.did.progress = this.progress;
                this.publicationService.savePersistentInfo(this.publicationService.persistentInfo);
              }
            }, 10000);
            await this.repeatinglyCheckAssistPublicationStatus();
          } else if(this.didIsPublished()) {
            this.progress = 1;
          }
        }
        catch (e) {
          console.warn("Handled global exception:", e);
          this.zone.run(() => this.suggestRestartingFromScratch = true);
          resolve();
        }
      }, 1000);
    });
  }

  public isDIDBeingPublished(): boolean {
    return this.publicationService.persistentInfo.did.publicationStatus === DIDPublicationStatus.AWAITING_PUBLICATION_CONFIRMATION;
  }

  public isDIDOnChain(): boolean {
    return this.publicationService.persistentInfo.did.publicationStatus === DIDPublicationStatus.PUBLISHED_AND_CONFIRMED;
  }

  public didIsPublished() {
    if(this.profileService.isPublishStatusFetched()) {
      if(!this.profileService.didNeedsToBePublished) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  /**
   * Checks assist publication status in a loop until we know the transaction is successful or failing.
   */
  private async repeatinglyCheckAssistPublicationStatus(): Promise<void> {
    let firstAttempt = true;

    do {
      if (!firstAttempt) {
        console.log("Waiting a few seconds before checking again");
        setTimeout(()=> {}, 15000);
      }

      await this.publicationService.checkPublicationStatusAndUpdate();

      firstAttempt = false;
    }
    while (this.publicationService.persistentInfo.did.publicationStatus == DIDPublicationStatus.AWAITING_PUBLICATION_CONFIRMATION);
  }

  /**
   * Clears all context and restarts identity creation from 0.
   */
  public async restartProcessFromScratch() {
    this.suggestRestartingFromScratch = false;
    this.publicationService.savePersistentInfo(this.publicationService.createNewPersistentInfo());
    this.resumeIdentitySetupFlow();
  }

  getProgress() {
    let percent = this.progress * 100;
    return percent.toFixed(0);
  }

  returnHome() {
    this.native.setRootRouter('/identity/myprofile/home');
  }
}
